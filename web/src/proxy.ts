import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { isConfigured } from "@/lib/env";

const PROTECTED = ["/dashboard", "/me", "/messages", "/notifications", "/admin", "/welcome"];

/**
 * Cheap gate: redirects signed-out visitors away from private areas based on the session
 * cookie. Real authorisation happens in pages/actions/services (getViewer + service checks).
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Not configured yet: show the setup page instead of letting every page throw.
  if (!isConfigured) {
    if (path === "/setup") return NextResponse.next();
    return NextResponse.rewrite(new URL("/setup", request.url));
  }
  if (PROTECTED.some((p) => path === p || path.startsWith(p + "/")) && !getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/auth|files/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
