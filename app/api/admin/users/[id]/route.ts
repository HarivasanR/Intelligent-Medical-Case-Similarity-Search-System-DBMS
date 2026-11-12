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
  if (isNaN(targetUserId) || targetUserId <= 0) {
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
    const message = error instanceof Error ? error.message : "Failed to deactivate user.";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  return PATCH(request, props);
}
