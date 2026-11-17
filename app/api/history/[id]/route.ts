import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/utils";
import { deleteSearchHistory } from "@/services/database-cases";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid history ID." }, { status: 400 });
  if (isDemoMode()) return NextResponse.json({ demo: true });
  try {
    const deleted = await deleteSearchHistory(id, user.id);
    return NextResponse.json(deleted ? { ok: true } : { error: "History entry not found." }, { status: deleted ? 200 : 404 });
  } catch { return NextResponse.json({ error: "Could not delete history." }, { status: 500 }); }
}
