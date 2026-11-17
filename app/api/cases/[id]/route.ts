import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/utils";
import { caseSchema } from "@/lib/validation";
import { deleteDatabaseCase, updateDatabaseCase } from "@/services/database-cases";

type Context = { params: Promise<{ id: string }> };
async function mutate(request: Request, context: Context, deleting: boolean) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (deleting && user.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid case ID." }, { status: 400 });
  const parsed = deleting ? null : caseSchema.safeParse(await request.json().catch(() => null));
  if (parsed && !parsed.success) return NextResponse.json({ error: "Please correct the case information.", details: parsed.error.flatten() }, { status: 400 });
  if (isDemoMode()) return NextResponse.json({ demo: true, message: "Preview only. Use database mode to save changes." });
  try {
    const item = deleting ? await deleteDatabaseCase(id, user.id) : await updateDatabaseCase(id, parsed!.data!, user.id);
    return NextResponse.json({ item });
  } catch (error) {
    const missing = error instanceof Error && error.message === "Case not found.";
    return NextResponse.json({ error: missing ? "Case not found." : "Could not confirm the change. Refresh before retrying." }, { status: missing ? 404 : 500 });
  }
}
export async function PUT(request: Request, context: Context) { return mutate(request, context, false); }
export async function DELETE(request: Request, context: Context) { return mutate(request, context, true); }
