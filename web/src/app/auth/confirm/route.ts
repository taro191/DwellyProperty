import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Email magic-link / confirmation (token_hash flow). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && data.user) {
      const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", data.user.id).single();
      const target = profile?.onboarded_at ? next : `/welcome?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(`${origin}${target}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
