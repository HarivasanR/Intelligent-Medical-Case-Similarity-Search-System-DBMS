import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import type { Role, SessionUser } from "@/types";

// Kept separate from lib/auth.ts so middleware can verify tokens without importing next/headers.
export const SESSION_COOKIE = "medmatch_session";
export const SESSION_HOURS = 8;
function getSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32 || value.startsWith("replace-")) throw new Error("Run npm run setup to configure AUTH_SECRET (at least 32 characters).");
  return new TextEncoder().encode(value);
}

export function signSessionToken(user: SessionUser) {
  return new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" }).setSubject(String(user.id)).setIssuedAt().setExpirationTime(`${SESSION_HOURS}h`).sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (!Number.isSafeInteger(Number(payload.sub)) || Number(payload.sub) <= 0 || !["ADMIN", "STAFF"].includes(String(payload.role))) return null;
    return { id: Number(payload.sub), name: String(payload.name), email: String(payload.email), role: payload.role as Role };
  } catch { return null; }
}
