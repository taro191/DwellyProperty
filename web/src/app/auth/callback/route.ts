import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth (Google) code exchange. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", data.user.id).single();
      const target = profile?.onboarded_at ? next : `/welcome?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(`${origin}${target}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=oauth&next=${encodeURIComponent(next)}`);
}
