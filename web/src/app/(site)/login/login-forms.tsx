"use client";

import { useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { Field, Input, cn } from "@/components/ui";
import { sendEmailOtp, signInWithPassword, signInWithProvider, verifyEmailOtp } from "./actions";

export function LoginForms({ next, providers }: { next: string; providers: { google: boolean; line: boolean } }) {
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [otpEmail, setOtpEmail] = useState<string | null>(null);

  return (
    <div className="mt-6 space-y-5">
      {providers.line && (
        <form action={signInWithProvider}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="provider" value="line" />
          <button className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#06C755] font-semibold text-white hover:bg-[#05b34c]">
            <span className="rounded-md bg-white px-1.5 text-xs font-black text-[#06C755]">LINE</span>
            เข้าสู่ระบบด้วย LINE
          </button>
        </form>
      )}
      {providers.google && (
      <form action={signInWithProvider}>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="provider" value="google" />
        <button className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-line bg-white font-semibold text-gray-900 hover:bg-gray-100">
          <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          เข้าสู่ระบบด้วย Google
        </button>
      </form>
      )}

      {(providers.google || providers.line) && (
        <div className="flex items-center gap-3 text-xs text-subtle">
          <span className="h-px flex-1 bg-line" /> หรือใช้อีเมล <span className="h-px flex-1 bg-line" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1 text-sm">
        {(["otp", "password"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn("rounded-xl py-2 font-semibold", mode === m ? "bg-surface text-fg" : "text-subtle")}
          >
            {m === "otp" ? "รหัสทางอีเมล" : "รหัสผ่าน"}
          </button>
        ))}
      </div>

      {mode === "otp" && !otpEmail && (
        <ActionForm
          action={sendEmailOtp}
          className="space-y-3"
          onSuccess={(r) => r.ok && setOtpEmail((r.data as { email: string }).email)}
        >
          <input type="hidden" name="next" value={next} />
          <Field label="อีเมล">
            <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
            <FieldError name="email" />
          </Field>
          <SubmitButton className="w-full" pendingText="กำลังส่ง…">ส่งรหัสเข้าสู่ระบบ</SubmitButton>
        </ActionForm>
      )}

      {mode === "otp" && otpEmail && (
        <ActionForm action={verifyEmailOtp} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={otpEmail} />
          <p className="text-sm text-muted">
            ส่งรหัสไปที่ <b className="text-fg">{otpEmail}</b> แล้ว{" "}
            <button type="button" className="text-accent underline" onClick={() => setOtpEmail(null)}>เปลี่ยนอีเมล</button>
          </p>
          <Field label="รหัส 6 หลัก">
            <Input name="token" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="tracking-[0.5em] text-center text-lg" />
            <FieldError name="token" />
          </Field>
          <SubmitButton className="w-full" pendingText="กำลังตรวจสอบ…">ยืนยันรหัส</SubmitButton>
        </ActionForm>
      )}

      {mode === "password" && (
        <ActionForm action={signInWithPassword} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <Field label="อีเมล">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="รหัสผ่าน">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <SubmitButton className="w-full" pendingText="กำลังเข้าสู่ระบบ…">เข้าสู่ระบบ</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
