import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getConnectionMock, beginTransactionMock, connectionExecuteMock, queryMock,
  commitMock, rollbackMock, releaseMock, poolExecuteMock, mongoReplaceMock,
  qdrantUpsertMock, embedMock,
} = vi.hoisted(() => ({
  getConnectionMock: vi.fn(),
  beginTransactionMock: vi.fn(),
  connectionExecuteMock: vi.fn(),
  queryMock: vi.fn(),
  commitMock: vi.fn(),
  rollbackMock: vi.fn(),
  releaseMock: vi.fn(),
  poolExecuteMock: vi.fn(),
  mongoReplaceMock: vi.fn(),
  qdrantUpsertMock: vi.fn(),
  embedMock: vi.fn(),
}));

vi.mock("@/lib/mysql", () => ({
  getMySqlPool: () => ({
    getConnection: getConnectionMock,
    execute: poolExecuteMock,
  }),
}));
vi.mock("@/lib/mongodb", () => ({
  getMongoDb: async () => ({ collection: () => ({ replaceOne: mongoReplaceMock }) }),
}));
vi.mock("@/lib/qdrant", () => ({
  ensureCollection: async () => ({ upsert: qdrantUpsertMock }),
  getCollectionName: () => "medical_cases_test",
}));
vi.mock("@/services/cases", () => ({ caseToSearchText: () => "case text" }));
vi.mock("@/services/embedding", () => ({ embeddingService: { embed: embedMock } }));

import { processCaseOutboxBatch } from "@/services/case-outbox";

const payload = {
  caseId: 42,
  caseCode: "MC-12345678",
  caseData: {
    patientAge: 42, patientGender: "FEMALE", category: "Respiratory",
    symptoms: "Cough", medicalHistory: "Asthma", clinicalObservations: "Stable",
    diagnosis: "Pneumonia", treatment: "Antibiotics", notes: "",
    labResults: { hemoglobin: 13 }, examinationDetails: { chest: "Clear" },
  },
};

function setClaimedEvent(mongoCompletedAt: Date | null = null, qdrantCompletedAt: Date | null = null) {
  queryMock.mockResolvedValueOnce([[
    { id: 9, aggregate_id: 42, payload, attempts: 0,
      mongo_completed_at: mongoCompletedAt, qdrant_completed_at: qdrantCompletedAt },
  ], []]);
}

describe("case outbox worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    beginTransactionMock.mockResolvedValue(undefined);
    connectionExecuteMock.mockResolvedValue([{}, []]);
    commitMock.mockResolvedValue(undefined);
    rollbackMock.mockResolvedValue(undefined);
    releaseMock.mockReturnValue(undefined);
    poolExecuteMock.mockResolvedValue([{}, []]);
    mongoReplaceMock.mockResolvedValue({ acknowledged: true });
    qdrantUpsertMock.mockResolvedValue({ status: "completed" });
    embedMock.mockResolvedValue([0.1, 0.2, 0.3]);
    getConnectionMock.mockResolvedValue({
      beginTransaction: beginTransactionMock,
      execute: connectionExecuteMock,
      query: queryMock,
      commit: commitMock,
      rollback: rollbackMock,
      release: releaseMock,
    });
  });

  it("upserts both read models and marks the event complete", async () => {
    setClaimedEvent();
    const result = await processCaseOutboxBatch(1);

    expect(result).toEqual({ claimed: 1, completed: 1 });
    expect(mongoReplaceMock).toHaveBeenCalledWith(
      { caseId: 42 },
      expect.objectContaining({ caseId: 42, laboratoryResults: payload.caseData.labResults }),
      { upsert: true },
    );
    expect(qdrantUpsertMock).toHaveBeenCalledWith("medical_cases_test", expect.objectContaining({
      wait: true,
      points: [expect.objectContaining({ id: 42, payload: expect.objectContaining({ caseId: 42 }) }],
    }));
    expect(poolExecuteMock).toHaveBeenCalledWith(expect.stringContaining("status = 'COMPLETED'"), [9]);
    expect(commitMock).toHaveBeenCalledOnce();
    expect(releaseMock).toHaveBeenCalledOnce();
  });

  it("does not repeat MongoDB when its completion marker exists and Qdrant fails", async () => {
    setClaimedEvent(new Date(), null);
    qdrantUpsertMock.mockRejectedValueOnce(new Error("Qdrant unavailable"));

    const result = await processCaseOutboxBatch(1);

    expect(result).toEqual({ claimed: 1, completed: 0 });
    expect(mongoReplaceMock).not.toHaveBeenCalled();
    expect(qdrantUpsertMock).toHaveBeenCalledOnce();
    expect(poolExecuteMock).toHaveBeenCalledWith(
      expect.stringContaining("status = IF(attempts >= max_attempts"),
      expect.arrayContaining([expect.any(Number), "Qdrant unavailable", 9]),
    );
  });

  it("releases the MySQL claim connection after a claim", async () => {
    queryMock.mockResolvedValueOnce([[], []]);
    const result = await processCaseOutboxBatch(1);
    expect(result).toEqual({ claimed: 0, completed: 0 });
    expect(commitMock).toHaveBeenCalledOnce();
    expect(releaseMock).toHaveBeenCalledOnce();
  });
});
