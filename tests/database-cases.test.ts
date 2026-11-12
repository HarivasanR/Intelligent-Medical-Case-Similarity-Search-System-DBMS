import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("@/lib/mysql", () => ({
  getMySqlPool: () => ({ query: queryMock }),
}));

import { buildCaseListWhere, CASE_SELECT, listDatabaseCasesPage } from "@/services/database-cases";

describe("database case listing", () => {
  beforeEach(() => queryMock.mockReset());

  it("builds parameterized filters for text, category and gender", () => {
    const result = buildCaseListWhere({
      query: "cough",
      category: "Respiratory",
      gender: "FEMALE",
    });

    expect(result.where).toContain("mc.deleted_at IS NULL");
    expect(result.where).toContain("mc.case_code LIKE ?");
    expect(result.where).toContain("fd.name LIKE ?");
    expect(result.where).toContain("mc.category = ?");
    expect(result.where).toContain("mc.patient_gender = ?");
    expect(result.values).toEqual(["%cough%", "%cough%", "%cough%", "Respiratory", "FEMALE"]);
  });

  it("uses scalar subqueries so one case cannot fan out into duplicate rows", () => {
    expect(CASE_SELECT).toContain("SELECT d.name");
    expect(CASE_SELECT).toContain("SELECT t.description");
    expect(CASE_SELECT).toContain("LIMIT 1");
    expect(CASE_SELECT).not.toContain("LEFT JOIN case_treatments");
    expect(CASE_SELECT).not.toContain("LEFT JOIN case_diagnoses");
  });

  it("returns only the requested page and matching total", async () => {
    queryMock.mockImplementation((sql: string) => {
      if (sql.includes("COUNT(*) AS total")) return Promise.resolve([[{ total: 25 }], []]);
      if (sql.includes("SELECT DISTINCT category")) return Promise.resolve([[{ category: "Cardiology" }, { category: "Respiratory" }], []]);
      return Promise.resolve([[
        {
          id: 11,
          case_code: "MC-0011",
          patient_age: 42,
          patient_gender: "FEMALE",
          category: "Respiratory",
          symptoms: "Persistent cough",
          medical_history: "",
          clinical_observations: "Stable",
          notes: "",
          created_at: new Date("2026-10-01T10:00:00Z"),
          created_by: "Dr. Test",
          diagnosis: "Pneumonia",
          treatment: "Antibiotics",
        },
      ], []]);
    });

    const result = await listDatabaseCasesPage({
      page: 2,
      pageSize: 10,
      query: "cough",
      category: "Respiratory",
    });

    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(11);
    expect(result.categories).toEqual(["Cardiology", "Respiratory"]);

    const dataQuery = queryMock.mock.calls.find(([sql]) => String(sql).includes("ORDER BY mc.created_at"));
    expect(dataQuery?.[1]).toEqual(["%cough%", "%cough%", "%cough%", "Respiratory", 10, 10]);
    expect(String(dataQuery?.[0])).toContain("LIMIT ? OFFSET ?");
  });
});
