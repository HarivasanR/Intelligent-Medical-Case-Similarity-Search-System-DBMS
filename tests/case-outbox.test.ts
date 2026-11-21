import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/mysql", () => ({ getMySqlPool: () => ({ query: mocks.query }) }));
vi.mock("@/services/case-sync", () => ({ processCaseSync: mocks.sync }));
import { processCaseOutboxBatch } from "@/services/case-outbox";
describe("canonical outbox worker", () => {
  beforeEach(() => vi.resetAllMocks());
  it("drains the same queue used by edits and deletions", async () => {
    mocks.query.mockResolvedValue([[{ n: 3 }]]); mocks.sync.mockResolvedValue(3);
    expect(await processCaseOutboxBatch(25)).toEqual({ claimed: 3, completed: 3 });
    expect(mocks.query.mock.calls[0][0]).toContain("case_sync_outbox");
    expect(mocks.sync).toHaveBeenCalledWith(25);
  });
  it("reports incomplete delivery for retry", async () => {
    mocks.query.mockResolvedValue([[{ n: 3 }]]); mocks.sync.mockResolvedValue(0);
    expect(await processCaseOutboxBatch(2)).toEqual({ claimed: 2, completed: 0 });
  });
});
