import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { deactivateDatabaseUser } from "@/services/database-users";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Administrator privileges required." }, { status: 403 });
  }

  const { id } = await params;
  const targetUserId = Number(id);
  if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0) {
    return NextResponse.json({ error: "Invalid user ID provided." }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json({
      item: { id: targetUserId, isActive: false },
      message: "User deactivated in demo mode.",
      demo: true,
    });
  }

  try {
    const result = await deactivateDatabaseUser(targetUserId, session.id);
    return NextResponse.json({ item: result, message: "User deactivated successfully." });
  } catch (error) {
    console.error("Failed to deactivate user:", error);
    const allowed = ["Self-deactivation is not permitted. You cannot deactivate your own account.", "User not found.", "User is already deactivated.", "Cannot deactivate the last active Administrator account."];
    const message = error instanceof Error && allowed.includes(error.message) ? error.message : "Could not deactivate user. Check database availability.";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
