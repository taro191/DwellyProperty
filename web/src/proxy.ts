import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { isConfigured } from "@/lib/env";
import { INTRO_COOKIE, YEAR } from "@/lib/intro";

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
  // First visit: signed-out people (not crawlers) see the /start splash once before the home page.
  if (
    path === "/" && request.method === "GET" && !getSessionCookie(request) && !request.cookies.has(INTRO_COOKIE) &&
    !/bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse/i.test(request.headers.get("user-agent") ?? "")
  ) {
    const res = NextResponse.redirect(new URL("/start", request.url));
    res.cookies.set(INTRO_COOKIE, "1", { maxAge: YEAR, path: "/", sameSite: "lax" });
    return res;
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
