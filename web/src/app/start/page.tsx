import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, Briefcase, Building2, Eye, Home, KeyRound, Sparkles, TrendingUp } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { enabledProviders } from "@/server/auth";
import { signInWithProvider } from "@/app/(site)/login/actions";
import type { AppRole } from "@/lib/types";
import { startAs } from "./actions";

// Reads the session at request time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "ยินดีต้อนรับ" };

const ROLES: { role: AppRole; icon: typeof Home; title: string; sub: string; badge: string }[] = [
  { role: "buyer", icon: Home, title: "ผู้ซื้อ", sub: "ค้นหาคอนโด บ้านเดี่ยว ทาวน์โฮม เพื่ออยู่อาศัยจริง พร้อมสิทธิพิเศษในเทศกาล", badge: "ฟรี" },
  { role: "tenant", icon: KeyRound, title: "ผู้เช่า", sub: "ค้นหาห้องเช่า คอนโด บ้านเช่า นัดดูห้องจริง และทำสัญญาเช่าทันใจ", badge: "เช่าทันใจ" },
  { role: "owner", icon: Building2, title: "เจ้าของ / ขาย / ให้เช่า", sub: "ฝากขายหรือปล่อยเช่าโดยตรง จัดการประกาศ และกำหนดเงื่อนไขคอมมิชชั่นกับตัวแทน", badge: "เจ้าของทรัพย์" },
  { role: "investor", icon: TrendingUp, title: "นักลงทุน", sub: "ค้นหาทรัพย์ผลตอบแทนสูง (Rental Yield & Capital Gain) และดีลราคาพิเศษ", badge: "High Yield" },
  { role: "agent", icon: Briefcase, title: "นายหน้า", sub: "ตัวแทนและ Co-broker บริหารพอร์ต นำเสนอทรัพย์ และรับสิทธิ์ระบบ Dwelly Commission", badge: "Dwelly Partner" },
];

const CHIPS = ["🏠 Dwelly Property", "🤝 Buyer–Seller Match", "🗺️ Interactive Map", "✅ ข้อมูลตรวจสอบแล้ว"];

function LogoMark() {
  return (
    <div className="grid h-28 w-28 place-items-center rounded-3xl border border-accent/30 bg-accent/15">
      <svg viewBox="0 0 96 96" className="h-24 w-24" role="img" aria-label="Dwelly Property — ประตูสู่ความมั่งคั่ง">
        <path d="M24 14h23c21 0 35 14 35 34S68 82 47 82H24V14Z" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
        <path d="M39 78V61h18v17" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400" />
      </svg>
    </div>
  );
}

/** First screen for new visitors (design update 2026-10-08): splash → role pick → role's starting page. */
export default async function StartPage({ searchParams }: PageProps<"/start">) {
  if (await getViewer()) redirect("/");
  const step = (await searchParams).step === "role" ? "role" : "splash";

  if (step === "role") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10">
        <div className="pb-5 pt-10">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent">
            <Sparkles className="h-3.5 w-3.5" /> ระบบคัดกรองตามสิทธิ์ (Role Identification)
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">เลือกบทบาทการใช้งานหลักของคุณ</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">เลือก 1 ใน 5 บทบาท เพื่อปรับหน้าจอ สิทธิประโยชน์ และการเข้าถึงระบบ Dwelly ให้ตรงกับคุณ</p>
        </div>
        <form action={startAs} className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-3 pb-6">
            {ROLES.map(({ role, icon: Icon, title, sub, badge }, i) => (
              <label
                key={role}
                className="group flex cursor-pointer items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-all has-checked:border-2 has-checked:border-accent has-checked:bg-accent/10"
              >
                <input type="radio" name="role" value={role} defaultChecked={role === "buyer"} className="sr-only" />
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 group-has-checked:bg-accent group-has-checked:text-[#04130d]">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{i + 1}. {title}</span>
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">{badge}</span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-muted">{sub}</span>
                </span>
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-line group-has-checked:border-accent group-has-checked:bg-accent">
                  <span className="hidden h-2 w-2 rounded-full bg-bg group-has-checked:block" />
                </span>
              </label>
            ))}
          </div>
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-base font-bold text-[#04130d] shadow-lg shadow-accent/20 hover:opacity-90">
            บันทึกและเริ่มต้นค้นหา <ArrowRight className="h-5 w-5" />
          </button>
          <Link href="/start" className="mt-3 text-center text-xs text-subtle hover:text-fg">← ย้อนกลับ</Link>
        </form>
      </main>
    );
  }

  const social = enabledProviders.google || enabledProviders.line;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between px-6 pb-10">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 pt-10 text-center">
        <LogoMark />
        <div>
          <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-[0.3em] text-accent">
            <Sparkles className="h-3.5 w-3.5" /> มหกรรมอสังหาริมทรัพย์ยุคใหม่
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight">DWELLY</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-amber-400">PROPERTY</p>
          <p className="mx-auto mt-4 max-w-xs text-base font-medium leading-relaxed text-muted">
            เปลี่ยนทุกการค้นหาอสังหาริมทรัพย์ให้เป็นเรื่องง่าย มั่นใจ และตรงใจ ด้วยข้อมูลที่ผ่านการตรวจสอบพร้อมใช้งานทันที
          </p>
        </div>
        <div className="flex max-w-xs flex-wrap justify-center gap-2">
          {CHIPS.map((c) => (
            <span key={c} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted">{c}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-4">
        {social ? (
          <div className={enabledProviders.google && enabledProviders.line ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
            {enabledProviders.google && (
              <form action={signInWithProvider}>
                <input type="hidden" name="provider" value="google" />
                <input type="hidden" name="next" value="/" />
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs font-extrabold text-gray-800 shadow-md hover:bg-gray-100">
                  <span className="font-black text-[#4285F4]">G</span> Google เข้าสู่ระบบ
                </button>
              </form>
            )}
            {enabledProviders.line && (
              <form action={signInWithProvider}>
                <input type="hidden" name="provider" value="line" />
                <input type="hidden" name="next" value="/" />
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C755] px-3 py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#05b34c]">
                  <span className="rounded bg-white px-1 text-[10px] font-black text-[#06C755]">LINE</span> LINE เข้าสู่ระบบ
                </button>
              </form>
            )}
          </div>
        ) : null}
        <Link href="/login" className="text-center text-xs font-semibold text-muted hover:text-fg">
          {social ? "หรือเข้าสู่ระบบด้วยอีเมล" : "เข้าสู่ระบบ / สมัครสมาชิก"}
        </Link>
        <Link
          href="/start?step=role"
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-sm font-black text-[#04130d] shadow-lg shadow-accent/20 hover:opacity-90"
        >
          เลือกบทบาทการใช้งานหลักของคุณ <ArrowRight className="h-4 w-4" />
        </Link>
        <form action={startAs}>
          <button className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line py-3 text-xs font-semibold text-muted hover:text-fg">
            <Eye className="h-3.5 w-3.5" /> Guest Preview (เข้าชมในฐานะผู้เยี่ยมชม)
          </button>
        </form>
      </div>
    </main>
  );
}
