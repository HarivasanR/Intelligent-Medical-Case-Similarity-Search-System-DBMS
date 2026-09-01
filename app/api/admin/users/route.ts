import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { demoUsers } from "@/lib/demo-data";
import { createUserSchema } from "@/lib/validation";
import { createDatabaseUser, listDatabaseUsers } from "@/services/database-users";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Administrator privileges required." }, { status: 403 });
  }

  if ((process.env.DATA_MODE || "demo") === "demo") {
    const users = demoUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: true,
    }));
    return NextResponse.json({ users });
  }

  try {
    const users = await listDatabaseUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to list users:", error);
    return NextResponse.json({ error: "Failed to fetch users from database." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Administrator privileges required." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Invalid user information provided.";
    return NextResponse.json({ error: firstError, details: parsed.error.flatten() }, { status: 400 });
  }

  if ((process.env.DATA_MODE || "demo") === "demo") {
    const newUser = {
      id: Date.now(),
      name: parsed.data.fullName,
      email: parsed.data.email,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    };
    return NextResponse.json({ item: newUser, demo: true }, { status: 201 });
  }

  try {
    const newUser = await createDatabaseUser(parsed.data, session.id);
    return NextResponse.json({ item: newUser }, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    const message = error instanceof Error ? error.message : "Failed to create user.";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
