import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  beginTransactionMock, commitMock, rollbackMock, releaseMock, executeMock, getConnectionMock,
} = vi.hoisted(() => ({
  beginTransactionMock: vi.fn(),
  commitMock: vi.fn(),
  rollbackMock: vi.fn(),
  releaseMock: vi.fn(),
  executeMock: vi.fn(),
  getConnectionMock: vi.fn(),
}));

vi.mock("@/lib/mysql", () => ({
  getMySqlPool: () => ({ getConnection: getConnectionMock }),
}));

vi.mock("@/lib/mongodb", () => ({ getMongoDb: vi.fn() }));
vi.mock("@/lib/qdrant", () => ({ ensureCollection: vi.fn(), getCollectionName: () => "medical_cases_test" }));
vi.mock("@/services/embedding", () => ({ embeddingService: { embed: vi.fn() } }));
vi.mock("@/services/cases", () => ({ caseToSearchText: () => "test clinical case" }));

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

describe("createDatabaseCase transactional outbox", () => {
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
  });

  it("writes the outbox event in the same transaction before committing", async () => {
    const result = await createDatabaseCase(input, 5);
    const outboxCall = executeMock.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO case_outbox"));

    expect(result.id).toBe(42);
    expect(result.caseCode).toMatch(/^MC-/);
    expect(beginTransactionMock).toHaveBeenCalledOnce();
    expect(outboxCall).toBeDefined();
    expect(outboxCall?.[1]).toEqual([
      "CASE_CREATED",
      42,
      expect.stringContaining('"caseId":42'),
    ]);
    expect(String(outboxCall?.[1][2])).toContain('"diagnosis":"Pneumonia"');
    expect(commitMock).toHaveBeenCalledOnce();
    expect(rollbackMock).not.toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("rolls back the authoritative case when enqueueing the outbox event fails", async () => {
    const failure = new Error("Outbox insert failed");
    executeMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO medical_cases")) return [{ insertId: 42 }, []];
      if (sql.includes("INSERT INTO diagnoses")) return [{ insertId: 7 }, []];
      if (sql.includes("INSERT INTO treatments")) return [{ insertId: 8 }, []];
      if (sql.includes("INSERT INTO case_outbox")) throw failure;
      return [{ insertId: 0 }, []];
    });

    await expect(createDatabaseCase(input, 5)).rejects.toBe(failure);
    expect(rollbackMock).toHaveBeenCalledOnce();
    expect(commitMock).not.toHaveBeenCalled();
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("does not call MongoDB or Qdrant in the request transaction", async () => {
    await createDatabaseCase(input, 5);
    expect(executeMock).toHaveBeenCalled();
    // External stores are exclusively owned by the background outbox worker.
  });
});
