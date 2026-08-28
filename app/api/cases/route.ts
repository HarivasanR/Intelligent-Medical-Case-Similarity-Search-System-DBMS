import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { demoCases } from "@/lib/demo-data";
import { caseSchema } from "@/lib/validation";
import { createDatabaseCase, listDatabaseCases } from "@/services/database-cases";

export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = (process.env.DATA_MODE || "demo") === "demo" ? demoCases : await listDatabaseCases();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = caseSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Please correct the highlighted case information.", details: parsed.error.flatten() }, { status: 400 });
  if ((process.env.DATA_MODE || "demo") === "demo") return NextResponse.json({ item: { ...parsed.data, id: demoCases.length + 1, caseCode: `MC-${String(demoCases.length + 1).padStart(4, "0")}` }, demo: true }, { status: 201 });
  const result = await createDatabaseCase(parsed.data, user.id);
  return NextResponse.json({ item: result }, { status: 201 });
}
