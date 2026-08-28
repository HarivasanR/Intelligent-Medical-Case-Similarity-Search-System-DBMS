import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role, SessionUser } from "@/types";

const COOKIE_NAME = "medmatch_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-secret-change-before-production-123");

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" }).setSubject(String(user.id)).setIssuedAt().setExpirationTime("8h").sign(secret);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
}

export async function clearSession() { (await cookies()).delete(COOKIE_NAME); }

export async function getSession(): Promise<SessionUser | null> {
  try {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return { id: Number(payload.sub), name: String(payload.name), email: String(payload.email), role: payload.role as Role };
  } catch { return null; }
}

export async function requireSession(roles?: Role[]) {
  const user = await getSession();
  if (!user || (roles && !roles.includes(user.role))) return null;
  return user;
}
