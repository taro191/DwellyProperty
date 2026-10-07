"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formObject, invalid } from "@/lib/action-utils";
import { SITE_URL } from "@/lib/env";
import type { ActionResult } from "@/lib/types";

const safeNext = (next: unknown) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : SITE_URL;
}

/** After any successful sign-in: first-timers go through onboarding (consent + role). */
async function postLoginRedirect(next: string): Promise<never> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (uid) {
    const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", uid).single();
    if (!profile?.onboarded_at) redirect(`/welcome?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

const emailSchema = z.object({ email: z.email("อีเมลไม่ถูกต้อง"), next: z.string().optional() });

export async function sendEmailOtp(fd: FormData): Promise<ActionResult<{ email: string }>> {
  const parsed = emailSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(safeNext(parsed.data.next))}`,
    },
  });
  if (error) {
    console.error("[auth] otp", error.message);
    return { ok: false, error: error.status === 429 ? "ขอรหัสบ่อยเกินไป กรุณารอสักครู่" : "ส่งรหัสไม่สำเร็จ กรุณาลองใหม่" };
  }
  return { ok: true, data: { email: parsed.data.email }, message: "ส่งรหัส 6 หลักไปที่อีเมลแล้ว (หรือกดลิงก์ในอีเมล)" };
}

const otpSchema = z.object({
  email: z.email(),
  token: z.string().regex(/^\d{6}$/, "กรอกรหัส 6 หลัก"),
  next: z.string().optional(),
});

export async function verifyEmailOtp(fd: FormData): Promise<ActionResult> {
  const parsed = otpSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.token, type: "email" });
  if (error) return { ok: false, error: "รหัสไม่ถูกต้องหรือหมดอายุ" };
  return postLoginRedirect(safeNext(parsed.data.next));
}

const passwordSchema = z.object({
  email: z.email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร"),
  next: z.string().optional(),
});

export async function signInWithPassword(fd: FormData): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { ok: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  return postLoginRedirect(safeNext(parsed.data.next));
}

export async function signInWithGoogle(fd: FormData): Promise<void> {
  const next = safeNext(fd.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/login?error=oauth&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
