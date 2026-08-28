import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { createSession } from "@/lib/auth";
import { demoUsers } from "@/lib/demo-data";
import { getMySqlPool } from "@/lib/mysql";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const { email, password } = parsed.data;
  if ((process.env.DATA_MODE || "demo") === "demo") {
    const user = demoUsers.find((item) => item.email === email && item.password === password);
    if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    await createSession(user);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }
  const [rows] = await getMySqlPool().execute<RowDataPacket[]>("SELECT u.id, u.full_name, u.email, u.password_hash, r.name role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=? AND u.is_active=TRUE", [email]);
  const row = rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  await createSession({ id: row.id, name: row.full_name, email: row.email, role: row.role });
  return NextResponse.json({ ok: true });
}
