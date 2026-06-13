import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight edge gate: bounce clearly-unauthenticated visitors away from
 * protected areas before they hit the server. Authoritative role checks are
 * enforced again in each protected layout via requireRole() (defence in depth).
 */
const PROTECTED_PREFIXES = ["/app", "/helper/dashboard", "/admin"];

function hasSessionCookie(req: NextRequest): boolean {
  return (
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (isProtected && !hasSessionCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/helper/dashboard/:path*", "/admin/:path*"],
};
