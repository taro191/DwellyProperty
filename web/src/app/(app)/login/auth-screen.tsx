"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Building2, CircleAlert, Eye, EyeOff, Home, KeyRound, Lock, Mail, Sparkles, TrendingUp, User } from "lucide-react";
import { GoogleIcon, LineIcon } from "@/components/app/brand-icons";
import {
  completeRegistration, sendEmailOtp, signInWithPassword, signInWithProvider, startRegistration, verifyEmailOtp,
} from "@/app/(site)/login/actions";
import type { ActionResult, AppRole } from "@/lib/types";

const ROLES: { role: AppRole; title: string; icon: typeof Home }[] = [
  { role: "buyer", title: "ผู้ซื้อ", icon: Home },
  { role: "tenant", title: "ผู้เช่า", icon: KeyRound },
  { role: "owner", title: "เจ้าของ/ขาย/ให้เช่า", icon: Building2 },
  { role: "investor", title: "นักลงทุน", icon: TrendingUp },
  { role: "agent", title: "นายหน้า", icon: Briefcase },
];
const field = "w-full pl-9 pr-3.5 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]";

/** Sign in / sign up (design: `ym`, screen "auth"). */
export function AuthScreen({
  next, initialMode, providers, defaultRole, error: initialError,
}: { next: string; initialMode: "login" | "register"; providers: { google: boolean; line: boolean }; defaultRole: AppRole; error: string | null }) {
  const [mode, setMode] = useState(initialMode);
  const [otpLogin, setOtpLogin] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState<AppRole>(defaultRole);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<ActionResult<unknown> | void>, onOk?: (r: ActionResult<unknown>) => void) =>
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if (!r) return; // redirected
      if (r.ok) onOk?.(r);
      else setError(r.fieldErrors ? Object.values(r.fieldErrors).flat()[0] ?? r.error : r.error);
    });
  const form = (extra: Record<string, string>) => {
    const fd = new FormData();
    fd.set("next", next);
    for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    return fd;
  };
  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setCodeSentTo(null);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return setError("กรุณากรอกอีเมลที่ถูกต้อง");
    if (mode === "login" && otpLogin) {
      if (!codeSentTo) return run(() => sendEmailOtp(form({ email })), () => setCodeSentTo(email));
      return run(() => verifyEmailOtp(form({ email: codeSentTo, token: code })));
    }
    if (password.length < 8) return setError("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
    if (mode === "login") return run(() => signInWithPassword(form({ email, password })));
    const reg = { name, role, email, password };
    if (!codeSentTo) return run(() => startRegistration(form(reg)), () => setCodeSentTo(email));
    return run(() => completeRegistration(form({ ...reg, token: code })));
  };
  const awaitingCode = Boolean(codeSentTo) && (mode === "register" || otpLogin);

  return (
    <div className="min-h-dvh pb-20 bg-[var(--bg)]">
      <div className="px-5 pt-4 max-w-md mx-auto space-y-4">
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#122819] via-[var(--surface)] to-[var(--surface-2)] border border-[var(--accent)]/30 text-center space-y-2 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] mx-auto font-black shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-black text-lg text-[var(--text-primary)]">DWELLY PROPERTY & DATABASE</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">เข้าสู่ระบบเพื่อซิงก์ข้อมูลอสังหาฯ บันทึกยูนิตโปรด และติดตามนัดหมาย ข้อเสนอ และแชทกับผู้ขาย</p>
        </div>
        <div className="p-1 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex gap-1">
          {(["login", "register"] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${mode === m ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "text-[var(--text-secondary)] hover:text-white"}`}
            >
              {m === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
          ))}
        </div>
        {(providers.google || providers.line) && (
          <div className="space-y-2.5">
            {providers.google && (
              <form action={signInWithProvider}>
                <input type="hidden" name="provider" value="google" />
                <input type="hidden" name="next" value={next} />
                <button className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs shadow-md border border-gray-200 flex items-center justify-center gap-3 transition-all">
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>{mode === "login" ? "เข้าสู่ระบบด้วย Google" : "สมัครด้วย Google"}</span>
                </button>
              </form>
            )}
            {providers.line && (
              <form action={signInWithProvider}>
                <input type="hidden" name="provider" value="line" />
                <input type="hidden" name="next" value={next} />
                <button className="w-full py-3 px-4 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs shadow-md flex items-center justify-center gap-3 transition-all">
                  <LineIcon className="w-5 h-5 shrink-0" />
                  <span>{mode === "login" ? "เข้าสู่ระบบด้วย LINE" : "สมัครด้วย LINE"}</span>
                </button>
              </form>
            )}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs font-semibold">
            <CircleAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={submit} className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-3.5 shadow-md">
          {awaitingCode ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                ส่งรหัส 6 หลักไปที่ <b className="text-[var(--text-primary)]">{codeSentTo}</b> แล้ว กรอกรหัสเพื่อ{mode === "register" ? "ยืนยันอีเมลและสร้างบัญชี" : "เข้าสู่ระบบ"}
              </p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                aria-label="รหัส 6 หลัก"
                className="w-full px-3.5 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center text-lg tracking-[0.5em] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button type="button" onClick={() => setCodeSentTo(null)} className="text-[11px] font-bold text-[var(--accent)] hover:underline">
                เปลี่ยนอีเมล / ส่งรหัสใหม่
              </button>
            </div>
          ) : (
            <>
              {mode === "register" && (
                <>
                  <label className="block">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">ชื่อ - นามสกุล</span>
                    <span className="relative block">
                      <User className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-3.5" />
                      <input required minLength={2} maxLength={80} type="text" placeholder="เช่น คุณกฤษดา พัฒนกิจ" value={name} onChange={(e) => setName(e.target.value)} className={field} />
                    </span>
                  </label>
                  <div>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1.5">เลือกบทบาทของคุณ:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ROLES.map((r) => {
                        const Icon = r.icon;
                        const on = role === r.role;
                        return (
                          <button
                            type="button"
                            onClick={() => setRole(r.role)}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${on ? "bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--text-primary)]" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]"}`}
                            key={r.role}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-[11px] font-extrabold truncate">{r.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              <label className="block">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">อีเมล</span>
                <span className="relative block">
                  <Mail className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-3.5" />
                  <input required type="email" autoComplete="email" placeholder="yourname@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
                </span>
              </label>
              {!(mode === "login" && otpLogin) && (
                <label className="block">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">รหัสผ่าน</span>
                  <span className="relative block">
                    <Lock className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-3.5" />
                    <input
                      required
                      type={showPw ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder="อย่างน้อย 8 ตัวอักษร"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${field} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-[var(--text-secondary)]" aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </span>
                </label>
              )}
            </>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full py-3.5 rounded-2xl bg-[var(--accent)] text-[var(--bg)] font-black text-sm hover:brightness-110 shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
          >
            <span>
              {pending
                ? "กำลังดำเนินการ…"
                : awaitingCode
                  ? "ยืนยันรหัส"
                  : mode === "register"
                    ? "สมัครสมาชิก"
                    : otpLogin
                      ? "ส่งรหัสเข้าสู่ระบบทางอีเมล"
                      : "เข้าสู่ระบบ"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setOtpLogin(!otpLogin);
                setCodeSentTo(null);
                setError(null);
              }}
              className="w-full text-center text-[11px] font-bold text-[var(--accent)] hover:underline"
            >
              {otpLogin ? "เข้าสู่ระบบด้วยรหัสผ่านแทน" : "ไม่มีรหัสผ่าน / ลืมรหัสผ่าน? รับรหัสทางอีเมลแทน"}
            </button>
          )}
        </form>
        <p className="text-[10px] text-center text-[var(--text-secondary)]">
          การเข้าสู่ระบบถือว่าคุณยอมรับ{" "}
          <Link href="/legal/terms" className="underline">
            ข้อกำหนดการใช้งาน
          </Link>{" "}
          และ{" "}
          <Link href="/legal/privacy" className="underline">
            นโยบายความเป็นส่วนตัว
          </Link>
        </p>
      </div>
    </div>
  );
}
