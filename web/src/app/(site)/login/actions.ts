"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { formObject, invalid } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";

const safeNext = (next: unknown) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";

const afterLogin = (next: string) => `/auth/after?next=${encodeURIComponent(next)}`;

/** Where a freshly signed-in user should land (server actions cannot follow a route-handler redirect). */
async function landing(userId: string, next: string) {
  const [p] = await db.select({ onboarded_at: profiles.onboarded_at }).from(profiles).where(eq(profiles.id, userId)).limit(1);
  return p?.onboarded_at ? next : `/welcome?next=${encodeURIComponent(next)}`;
}

function authError(e: unknown, fallback: string): ActionResult<never> {
  if (e instanceof APIError) {
    if (e.status === "TOO_MANY_REQUESTS") return { ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่" };
    if (String(e.body?.message ?? e.message).includes("LOGIN_DISABLED")) {
      return { ok: false, error: "บัญชีนี้ถูกปิดการเข้าสู่ระบบ กรุณาติดต่อทีมงาน" };
    }
    return { ok: false, error: fallback };
  }
  throw e;
}

const emailSchema = z.object({ email: z.email("อีเมลไม่ถูกต้อง"), next: z.string().optional() });

export async function sendEmailOtp(fd: FormData): Promise<ActionResult<{ email: string }>> {
  const parsed = emailSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    await auth.api.sendVerificationOTP({ body: { email: parsed.data.email.toLowerCase(), type: "sign-in" } });
  } catch (e) {
    if (e instanceof APIError) return authError(e, "ส่งรหัสไม่สำเร็จ กรุณาลองใหม่");
    console.error("[auth] send OTP failed", e); // e.g. mail server unreachable
    return { ok: false, error: "ส่งรหัสไม่สำเร็จ กรุณาลองใหม่ หรือติดต่อทีมงาน" };
  }
  return { ok: true, data: { email: parsed.data.email.toLowerCase() }, message: "ส่งรหัส 6 หลักไปที่อีเมลแล้ว" };
}

const otpSchema = z.object({ email: z.email(), token: z.string().regex(/^\d{6}$/, "กรอกรหัส 6 หลัก"), next: z.string().optional() });

export async function verifyEmailOtp(fd: FormData): Promise<ActionResult> {
  const parsed = otpSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  let userId: string;
  try {
    userId = (await auth.api.signInEmailOTP({ body: { email: parsed.data.email, otp: parsed.data.token }, headers: await headers() })).user.id;
  } catch (e) {
    return authError(e, "รหัสไม่ถูกต้องหรือหมดอายุ");
  }
  redirect(await landing(userId, safeNext(parsed.data.next)));
}

const passwordSchema = z.object({
  email: z.email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร"),
  next: z.string().optional(),
});

export async function signInWithPassword(fd: FormData): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  let userId: string;
  try {
    userId = (await auth.api.signInEmail({ body: { email: parsed.data.email.toLowerCase(), password: parsed.data.password }, headers: await headers() })).user.id;
  } catch (e) {
    return authError(e, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }
  redirect(await landing(userId, safeNext(parsed.data.next)));
}

export async function signInWithProvider(fd: FormData): Promise<void> {
  const next = safeNext(fd.get("next"));
  const provider = fd.get("provider") === "line" ? "line" : "google";
  let url: string | undefined;
  try {
    const res = await auth.api.signInSocial({ body: { provider, callbackURL: afterLogin(next), errorCallbackURL: `/login?error=oauth` } });
    url = res.url;
  } catch (e) {
    console.error("[auth] social", e);
  }
  redirect(url ?? `/login?error=oauth&next=${encodeURIComponent(next)}`);
}

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
