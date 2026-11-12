import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { createSession } from "@/lib/auth";
import { demoUsers } from "@/lib/demo-data";
import { getMySqlPool } from "@/lib/mysql";
import { isDemoMode } from "@/lib/utils";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const { email, password } = parsed.data;
  if (isDemoMode()) {
    const user = demoUsers.find((item) => item.email === email && item.password === password);
    if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    await createSession(user);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }
  try {
    const pool = getMySqlPool();
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT u.id, u.full_name, u.email, u.password_hash, r.name role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=? AND u.is_active=TRUE", [email]);
    const row = rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    await createSession({ id: Number(row.id), name: row.full_name, email: row.email, role: row.role });
    await pool.execute("INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, 'LOGIN', 'user', ?)", [row.id, row.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Cannot reach the database. Is MySQL running?" }, { status: 500 });
  }
}
