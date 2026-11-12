import { SignJWT, jwtVerify } from "jose";
import type { Role, SessionUser } from "@/types";

// Kept separate from lib/auth.ts so middleware can verify tokens without importing next/headers.
export const SESSION_COOKIE = "medmatch_session";
export const SESSION_HOURS = 8;
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-secret-change-before-production-123");

export function signSessionToken(user: SessionUser) {
  return new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" }).setSubject(String(user.id)).setIssuedAt().setExpirationTime(`${SESSION_HOURS}h`).sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { id: Number(payload.sub), name: String(payload.name), email: String(payload.email), role: payload.role as Role };
  } catch { return null; }
}
