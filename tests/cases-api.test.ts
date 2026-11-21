// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ getSession: async () => ({ id: 1 }) }));
vi.mock("@/lib/utils", () => ({ isDemoMode: () => true }));
vi.mock("@/services/database-cases", () => ({ createDatabaseCase: vi.fn(), listDatabaseCasesPage: vi.fn() }));
import { GET } from "@/app/api/cases/route";
describe("case API pagination", () => {
  it("honors numeric page and pageSize parameters", async () => {
    const r = await GET(new Request("http://localhost/api/cases?page=2&pageSize=5"));
    const data = await r.json();
    expect(data.page).toBe(2); expect(data.pageSize).toBe(5);
    expect(data.items).toHaveLength(5); expect(data.items[0].id).toBe(6);
  });
  it("caps page size and falls back for invalid page values", async () => {
    const data = await (await GET(new Request("http://localhost/api/cases?page=invalid&pageSize=9999"))).json();
    expect(data.page).toBe(1); expect(data.pageSize).toBe(50);
  });
});
