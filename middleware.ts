import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

export async function middleware(request: NextRequest) {
  // Verify the token itself, not just that a cookie exists, so expired or tampered sessions go back to /login.
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const hasSession = token ? (await verifySessionToken(token)) !== null : false;
  const isLogin = request.nextUrl.pathname === "/login";
  if (!hasSession && !isLogin) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  if (hasSession && isLogin) return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/cases/:path*", "/search/:path*", "/history/:path*", "/admin/:path*", "/login"] };
