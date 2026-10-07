import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";

/** Landing point after any sign-in (incl. Google/LINE): first-timers go through onboarding. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL(`/login?error=oauth&next=${encodeURIComponent(next)}`, request.url));
  const target = viewer.profile.onboarded_at ? next : `/welcome?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(target, request.url));
}
