import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_HOURS, signSessionToken, verifySessionToken } from "@/lib/session-token";
import type { Role, SessionUser } from "@/types";

export async function createSession(user: SessionUser) {
  const token = await signSessionToken(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * SESSION_HOURS });
}

export async function clearSession() { (await cookies()).delete(SESSION_COOKIE); }

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function requireSession(roles?: Role[]) {
  const user = await getSession();
  if (!user || (roles && !roles.includes(user.role))) return null;
  return user;
}
