import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
    }
    return NextResponse.next();
  }
  // Verify the token itself, not just that a cookie exists, so expired or tampered sessions go back to /login.
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const hasSession = token ? (await verifySessionToken(token)) !== null : false;
  const isLogin = request.nextUrl.pathname === "/login";
  if (!hasSession && !isLogin) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  // Login redirects are decided on the server after the live account check.
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/dashboard/:path*", "/cases/:path*", "/search/:path*", "/history/:path*", "/admin/:path*", "/login"] };
