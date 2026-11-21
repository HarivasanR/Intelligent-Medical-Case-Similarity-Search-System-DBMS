import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/utils";
import { processCaseSync } from "@/services/case-sync";
export async function POST() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  if (isDemoMode()) return NextResponse.json({ message: "Preview only: no database writes." });
  try { return NextResponse.json({ message: `Processed ${await processCaseSync()} pending events. Refresh to check remaining events.` }); }
  catch { return NextResponse.json({ error: "Synchronization could not run. Check database availability." }, { status: 500 }); }
}
