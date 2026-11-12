import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { demoCases } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/utils";
import { caseSchema } from "@/lib/validation";
import { createDatabaseCase, listDatabaseCases } from "@/services/database-cases";

export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const items = isDemoMode() ? demoCases : await listDatabaseCases();
    return NextResponse.json({ items });
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
