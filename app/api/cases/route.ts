import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { demoCases } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/utils";
import { caseSchema } from "@/lib/validation";
import { createDatabaseCase, listDatabaseCasesPage } from "@/services/database-cases";

const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_MAX = 50;

function positiveInteger(value: string | null, fallback: number, maximum = Number.MAX_SAFE_INTEGER) {
  if (!value || !/^\\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export async function GET(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const page = positiveInteger(params.get("page"), 1);
  const pageSize = positiveInteger(params.get("pageSize"), PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);
  const query = (params.get("q") || "").trim().slice(0, 100);
  const category = (params.get("category") || "").trim().slice(0, 80);
  const genderValue = params.get("gender");
  const gender = genderValue === "MALE" || genderValue === "FEMALE" || genderValue === "OTHER" ? genderValue : undefined;

  try {
    if (isDemoMode()) {
      const filtered = demoCases.filter((item) =>
        (!query || [item.caseCode, item.symptoms, item.diagnosis].join(" ").toLowerCase().includes(query.toLowerCase())) &&
        (!category || item.category === category) &&
        (!gender || item.patientGender === gender)
      );
      const total = filtered.length;
      return NextResponse.json({
        items: filtered.slice((page - 1) * pageSize, page * pageSize),
        total, page, pageSize, totalPages: Math.ceil(total / pageSize),
        categories: [...new Set(demoCases.map((item) => item.category))].sort(),
      });
    }

    return NextResponse.json(await listDatabaseCasesPage({ page, pageSize, query, category, gender }));
  } catch (error) {
    console.error("Failed to list cases:", error);
    return NextResponse.json({ error: "Failed to load cases from the database." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = caseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please correct the highlighted case information.", details: parsed.error.flatten() }, { status: 400 });
  if (isDemoMode()) return NextResponse.json({ item: { ...parsed.data, id: demoCases.length + 1, caseCode: `MC-${String(demoCases.length + 1).padStart(4, "0")}` }, demo: true }, { status: 201 });
  try {
    const result = await createDatabaseCase(parsed.data, user.id);
    return NextResponse.json({ item: result }, { status: 201 });
  } catch (error) {
    console.error("Failed to create case:", error);
    return NextResponse.json({ error: "Case creation failed. Check database availability and retry; incomplete external writes are cleaned up on a best-effort basis." }, { status: 500 });
  }
}
