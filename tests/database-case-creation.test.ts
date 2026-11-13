import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  beginTransactionMock,
  commitMock,
  rollbackMock,
  releaseMock,
  executeMock,
  insertOneMock,
  deleteOneMock,
  upsertMock,
  qdrantDeleteMock,
  embedMock,
  getConnectionMock,
} = vi.hoisted(() => ({
  beginTransactionMock: vi.fn(),
  commitMock: vi.fn(),
  rollbackMock: vi.fn(),
  releaseMock: vi.fn(),
  executeMock: vi.fn(),
  insertOneMock: vi.fn(),
  deleteOneMock: vi.fn(),
  upsertMock: vi.fn(),
  qdrantDeleteMock: vi.fn(),
  embedMock: vi.fn(),
  getConnectionMock: vi.fn(),
}));

vi.mock("@/lib/mysql", () => ({
  getMySqlPool: () => ({ getConnection: getConnectionMock }),
}));

vi.mock("@/lib/mongodb", () => ({
  getMongoDb: async () => ({
    collection: () => ({ insertOne: insertOneMock, deleteOne: deleteOneMock }),
  }),
}));

vi.mock("@/lib/qdrant", () => ({
  ensureCollection: async () => ({ upsert: upsertMock, delete: qdrantDeleteMock }),
  getCollectionName: () => "medical_cases_test",
  getQdrant: vi.fn(),
}));

vi.mock("@/services/embedding", () => ({
  embeddingService: { embed: embedMock },
}));

vi.mock("@/services/cases", () => ({
  caseToSearchText: () => "test clinical case",
}));

import { createDatabaseCase } from "@/services/database-cases";

const input = {
  patientAge: 42,
  patientGender: "FEMALE" as const,
  category: "Respiratory",
  symptoms: "Persistent cough",
  medicalHistory: "Asthma",
  clinicalObservations: "Stable observations",
  diagnosis: "Pneumonia",
  treatment: "Antibiotics",
  notes: "Follow-up required",
  labResults: { hemoglobin: 13.2 },
  examinationDetails: { chest: "Clear" },
};

describe("createDatabaseCase cross-store writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    beginTransactionMock.mockResolvedValue(undefined);
    commitMock.mockResolvedValue(undefined);
    rollbackMock.mockResolvedValue(undefined);
    releaseMock.mockReturnValue(undefined);
    executeMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO medical_cases")) return [{ insertId: 42 }, []];
      if (sql.includes("INSERT INTO diagnoses")) return [{ insertId: 7 }, []];
      if (sql.includes("INSERT INTO treatments")) return [{ insertId: 8 }, []];
      return [{ insertId: 0 }, []];
    });
    getConnectionMock.mockResolvedValue({
      beginTransaction: beginTransactionMock,
      execute: executeMock,
      commit: commitMock,
      rollback: rollbackMock,
      release: releaseMock,
    });
    insertOneMock.mockResolvedValue({ acknowledged: true });
    deleteOneMock.mockResolvedValue({ acknowledged: true, deletedCount: 1 });
    upsertMock.mockResolvedValue({ status: "completed" });
    qdrantDeleteMock.mockResolvedValue({ status: "completed" });
    embedMock.mockResolvedValue([0.1, 0.2, 0.3]);
  });

  it("commits MySQL only after MongoDB and Qdrant writes succeed", async () => {
    const result = await createDatabaseCase(input, 5);

    expect(result.id).toBe(42);
    expect(result.caseCode).toMatch(/^MC-/);
    expect(beginTransactionMock).toHaveBeenCalledOnce();
    expect(insertOneMock).toHaveBeenCalledWith(expect.objectContaining({
      caseId: 42,
      laboratoryResults: input.labResults,
      examinationDetails: input.examinationDetails,
    }));
    expect(upsertMock).toHaveBeenCalledWith("medical_cases_test", expect.objectContaining({
      wait: true,
      points: [expect.objectContaining({ id: 42, payload: expect.objectContaining({ caseId: 42 }) })],
    }));
    expect(commitMock).toHaveBeenCalledOnce();
    expect(rollbackMock).not.toHaveBeenCalled();
    expect(qdrantDeleteMock).not.toHaveBeenCalled();
    expect(deleteOneMock).not.toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("rolls back MySQL and compensates both external stores when Qdrant upsert fails", async () => {
    const failure = new Error("Qdrant write timed out");
    upsertMock.mockRejectedValueOnce(failure);

    await expect(createDatabaseCase(input, 5)).rejects.toBe(failure);

    expect(rollbackMock).toHaveBeenCalledOnce();
    expect(commitMock).not.toHaveBeenCalled();
    expect(qdrantDeleteMock).toHaveBeenCalledWith("medical_cases_test", {
      points: [42],
      wait: true,
    });
    expect(deleteOneMock).toHaveBeenCalledWith({ caseId: 42 });
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("compensates external stores when the final MySQL commit fails", async () => {
    const failure = new Error("MySQL commit failed");
    commitMock.mockRejectedValueOnce(failure);

    await expect(createDatabaseCase(input, 5)).rejects.toBe(failure);

    expect(rollbackMock).toHaveBeenCalledOnce();
    expect(upsertMock).toHaveBeenCalledOnce();
    expect(qdrantDeleteMock).toHaveBeenCalledWith("medical_cases_test", {
      points: [42],
      wait: true,
    });
    expect(deleteOneMock).toHaveBeenCalledWith({ caseId: 42 });
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("attempts MongoDB cleanup when its insert reports a failure", async () => {
    const failure = new Error("MongoDB insert failed");
    insertOneMock.mockRejectedValueOnce(failure);

    await expect(createDatabaseCase(input, 5)).rejects.toBe(failure);

    expect(rollbackMock).toHaveBeenCalledOnce();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(qdrantDeleteMock).not.toHaveBeenCalled();
    expect(deleteOneMock).toHaveBeenCalledWith({ caseId: 42 });
    expect(commitMock).not.toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("still attempts external cleanup if MySQL rollback fails", async () => {
    const failure = new Error("Qdrant write failed");
    upsertMock.mockRejectedValueOnce(failure);
    rollbackMock.mockRejectedValueOnce(new Error("MySQL rollback failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(createDatabaseCase(input, 5)).rejects.toBe(failure);

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to roll back MySQL transaction after case creation failed:",
      expect.any(Error),
    );
    expect(qdrantDeleteMock).toHaveBeenCalledWith("medical_cases_test", {
      points: [42],
      wait: true,
    });
    expect(deleteOneMock).toHaveBeenCalledWith({ caseId: 42 });
    expect(releaseMock).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
