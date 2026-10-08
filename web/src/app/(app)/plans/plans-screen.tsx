"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building, Check, CheckCircle2, ShieldAlert, TrendingUp, Trophy, Zap } from "lucide-react";
import { num } from "@/lib/listing-view";
import { orderBoost, orderPlan } from "./actions";

type Audience = "owner" | "investor" | "agent";
export type PlanItem = { id: string; audience: Audience; name: string; badge: string | null; description: string | null; price: number; period: string; features: string[] };
export type BoostItem = { id: string; name: string; description: string | null; price: number; days: number };

const SUITE = {
  owner: {
    title: "แพ็กเกจสำหรับเจ้าของทรัพย์", sub: "Owner & Landlord Solutions", badge: "OWNER SUITE", pill: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: Building, kicker: "สำหรับเจ้าของทรัพย์ (Owner & Landlord)", head: "ปิดการขายและปล่อยเช่า ไวขึ้น 3 เท่า",
    lead: "เข้าถึงเครือข่ายนายหน้า Co-Agent ล็อกสิทธิ์ผู้ซื้อตัวจริง (Lead Lock) และดันประกาศให้โดดเด่นสะดุดตา",
    hero: "from-[#0c2417] via-[var(--surface)] to-[#08170f] border-emerald-500/30", tone: "text-emerald-400", ring: "border-emerald-400 ring-emerald-400/20",
    hover: "hover:border-emerald-400/40", btn: "bg-emerald-400 text-black hover:bg-emerald-300", soft: "hover:bg-emerald-400/20", tab: "bg-emerald-400 text-black", badgeCls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    tabLabel: "แพ็กเกจสมาชิกเจ้าของ",
  },
  investor: {
    title: "แพ็กเกจสำหรับนักลงทุน (Investor)", sub: "Exclusive High Yield & Land Club", badge: "INVESTOR SUITE", pill: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    icon: TrendingUp, kicker: "สำหรับนักลงทุนอสังหาฯ (Investor Club)", head: "ดีลหลุดจอง & วิเคราะห์ Yield สูง",
    lead: "รับการแจ้งเตือนทรัพย์ราคาต่ำกว่าตลาดทันทีก่อนใคร วิเคราะห์ข้อมูลผู้เช่ารอบมหาวิทยาลัย และแปลงที่ดินศักยภาพ",
    hero: "from-[#0c1d33] via-[var(--surface)] to-[#081220] border-blue-500/30", tone: "text-blue-400", ring: "border-blue-400 ring-blue-400/20",
    hover: "hover:border-blue-400/40", btn: "bg-blue-400 text-black hover:bg-blue-300", soft: "hover:bg-blue-400/20", tab: "bg-blue-400 text-black", badgeCls: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    tabLabel: "แพ็กเกจนักลงทุน",
  },
  agent: {
    title: "แพ็กเกจสำหรับนายหน้า (Agency)", sub: "Agency Pro & Team Solutions", badge: "AGENCY PRO", pill: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: Trophy, kicker: "สำหรับนายหน้าและเอเจนซี (Agency Pro Suite)", head: "ยกระดับทีมขาย & คุ้มครองคอมมิชชั่น",
    lead: "เข้าถึงสต็อกทรัพย์ Co-Agent โดยตรงจากเจ้าของ พร้อมระบบ Lead Lock และโควตาดันประกาศประจำเดือน",
    hero: "from-[#1a0e2e] via-[var(--surface)] to-[#110a1f] border-purple-500/30", tone: "text-purple-400", ring: "border-purple-400 ring-purple-400/20",
    hover: "hover:border-purple-400/40", btn: "bg-purple-500 text-white hover:bg-purple-400", soft: "hover:bg-purple-400/20", tab: "bg-purple-500 text-white", badgeCls: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    tabLabel: "แพ็กเกจทีมนายหน้า",
  },
} as const;
const PERIOD: Record<string, string> = { month: "ต่อเดือน", year: "ต่อปี", lifetime: "ตลอดการใช้งาน" };

/** Plans & boosts (design: `xm`, screen "premium"). Orders stay pending until paid. */
export function PlansScreen({
  audience: initial, consumer, plans, boosts, myListings, signedIn,
}: {
  audience: Audience;
  consumer: "buyer" | "tenant" | null;
  plans: PlanItem[];
  boosts: BoostItem[];
  myListings: { id: string; title: string }[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>(initial);
  const [tab, setTab] = useState<"membership" | "boost">("membership");
  const [picked, setPicked] = useState<string>("");
  const [listing, setListing] = useState(myListings[0]?.id ?? "");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const S = SUITE[audience];
  const Icon = S.icon;
  const back = () => (window.history.length > 1 ? router.back() : router.push("/me"));

  const order = (fn: () => ReturnType<typeof orderPlan>) => {
    if (!signedIn) return router.push("/login?next=/plans");
    startTransition(async () => {
      const r = await fn();
      setNotice(r.ok ? { ok: true, text: r.message ?? "ส่งคำสั่งซื้อแล้ว" } : { ok: false, text: r.error });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  if (consumer) {
    return (
      <div className="min-h-dvh pb-24 bg-[var(--bg)] flex flex-col">
        <div className="flex items-center gap-3 px-4 h-14 bg-[var(--surface)] border-b border-[var(--border)]">
          <button type="button" onClick={back} className="p-1.5 -ml-1.5 text-[var(--text-secondary)] hover:text-white rounded-xl cursor-pointer" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-extrabold text-base text-[var(--text-primary)]">ศูนย์บริการสิทธิพิเศษ Dwelly</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[var(--surface)] border border-amber-500/30 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-lg text-[var(--text-primary)]">สิทธิ์สำหรับผู้ค้นหาและเช่าที่พัก</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                ขณะนี้คุณใช้งานในบทบาท &quot;{consumer === "tenant" ? "ผู้เช่า (Tenant)" : "ผู้ซื้อ (Buyer)"}&quot; สามารถค้นหาห้องและติดต่อเจ้าของทรัพย์ได้ฟรีโดยไม่มีค่าใช้จ่าย
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-[var(--surface-2)] text-left text-xs space-y-1.5 text-[var(--text-secondary)]">
              <p className="font-bold text-[var(--text-primary)] text-xs">สิทธิ์ฟรีของคุณ:</p>
              <p>✓ สำรวจและค้นหาอสังหาฯ ทุกโครงการฟรี</p>
              <p>✓ นัดชมห้องจริง / วิดีโอคอลกับผู้ดูแลฟรี</p>
              <p>✓ แชทและยื่นข้อเสนอกับผู้ขายโดยตรงฟรี</p>
            </div>
            <Link href={consumer === "tenant" ? "/rent" : "/"} className="block w-full py-3 rounded-xl font-bold text-xs bg-[var(--accent)] text-[var(--bg)] shadow-md hover:brightness-110 cursor-pointer">
              กลับไปสำรวจอสังหาฯ
            </Link>
            <p className="text-[11px] text-[var(--text-secondary)]">
              เป็นเจ้าของทรัพย์ นักลงทุน หรือนายหน้า?{" "}
              <button type="button" onClick={() => router.push("/plans?for=owner")} className="text-[var(--accent)] font-bold hover:underline">
                ดูแพ็กเกจทั้งหมด
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const list = plans.filter((p) => p.audience === audience);
  const card = (on: boolean) => `p-4 rounded-3xl border-2 transition-all cursor-pointer ${on ? `${S.ring} bg-[var(--surface)] shadow-lg ring-2` : `border-[var(--border)] bg-[var(--surface)]/70 ${S.hover}`}`;
  return (
    <div className="min-h-dvh pb-32 bg-[var(--bg)]">
      <div className="flex items-center justify-between px-4 h-14 bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={back} className="p-1.5 -ml-1.5 text-[var(--text-secondary)] hover:text-white rounded-xl hover:bg-[var(--surface-2)] transition-colors cursor-pointer" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-extrabold text-base text-[var(--text-primary)] truncate">{S.title}</h2>
            <p className="text-[10px] text-[var(--text-secondary)]">{S.sub}</p>
          </div>
        </div>
        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shrink-0 ${S.pill}`}>{S.badge}</span>
      </div>
      <div className="px-4 pt-3 flex gap-1.5">
        {(Object.keys(SUITE) as Audience[]).map((a) => (
          <button
            type="button"
            key={a}
            onClick={() => {
              setAudience(a);
              setTab("membership");
            }}
            className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${audience === a ? `${SUITE[a].pill}` : "border-[var(--border)] text-[var(--text-secondary)]"}`}
          >
            {a === "owner" ? "เจ้าของทรัพย์" : a === "investor" ? "นักลงทุน" : "นายหน้า"}
          </button>
        ))}
      </div>
      {notice && (
        <div className={`mx-4 mt-3 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${notice.ok ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{notice.text}</span>
        </div>
      )}
      <div className="space-y-4">
        <div className="px-4 pt-4">
          <div className={`p-4 rounded-3xl bg-gradient-to-br border shadow-lg relative overflow-hidden ${S.hero}`}>
            <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${S.tone}`}>
              <Icon className="w-4 h-4" />
              <span>{S.kicker}</span>
            </div>
            <h1 className="font-black text-xl text-[var(--text-primary)] mt-1.5">{S.head}</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{S.lead}</p>
          </div>
        </div>
        {audience !== "investor" && (
          <div className="px-4">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setTab("membership")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${tab === "membership" ? `${S.tab} shadow-md font-black` : "text-[var(--text-secondary)] hover:text-white"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>
                  {S.tabLabel} ({list.length} แผน)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab("boost")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${tab === "boost" ? "bg-amber-400 text-black shadow-md font-black" : "text-[var(--text-secondary)] hover:text-white"}`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>แพ็กเกจดันประกาศ (Boost)</span>
              </button>
            </div>
          </div>
        )}
        {(tab === "membership" || audience === "investor") && (
          <div className="px-4 flex flex-col gap-3.5">
            {list.map((c) => {
              const on = picked === c.id;
              return (
                <div onClick={() => setPicked(c.id)} className={card(on)} key={c.id}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-base text-[var(--text-primary)]">{c.name}</h4>
                        {c.badge && <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${S.badgeCls}`}>{c.badge}</span>}
                      </div>
                      {c.description && <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{c.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-xl text-[var(--text-primary)]">{c.price === 0 ? "ฟรี" : `฿${num(c.price)}`}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">{PERIOD[c.period] ?? c.period}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-[var(--border)] text-xs">
                    {c.features.map((f) => (
                      <div className="flex items-start gap-2 text-[var(--text-primary)]" key={f}>
                        <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${S.tone}`} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  {c.price > 0 && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        order(() => orderPlan(c.id));
                      }}
                      className={`w-full mt-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-60 ${on ? `${S.btn} shadow-md font-black` : `bg-[var(--surface-2)] text-[var(--text-primary)] ${S.soft}`}`}
                    >
                      สมัคร {c.name} (฿{num(c.price)})
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {tab === "boost" && audience !== "investor" && (
          <div className="px-4 flex flex-col gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 fill-current shrink-0" />
                <span>ซื้อแพ็กเกจดันประกาศเพิ่มยอดเข้าชมได้ทันทีเป็นรายครั้ง ไม่ต้องผูกมัด</span>
              </div>
              {signedIn && myListings.length > 0 ? (
                <select
                  value={listing}
                  onChange={(e) => setListing(e.target.value)}
                  aria-label="เลือกประกาศที่ต้องการดัน"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-amber-500/30 text-xs text-[var(--text-primary)] outline-none"
                >
                  {myListings.map((l) => (
                    <option value={l.id} key={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px]">
                  {signedIn ? "ยังไม่มีประกาศที่เผยแพร่อยู่ " : "เข้าสู่ระบบเพื่อเลือกประกาศที่ต้องการดัน "}
                  <Link href={signedIn ? "/dashboard/listings/new" : "/login?next=/plans"} className="font-bold underline">
                    {signedIn ? "ลงประกาศ" : "เข้าสู่ระบบ"}
                  </Link>
                </p>
              )}
            </div>
            {boosts.map((c) => {
              const on = picked === c.id;
              return (
                <div onClick={() => setPicked(c.id)} className={`p-4 rounded-3xl border-2 transition-all cursor-pointer ${on ? "border-amber-400 bg-[var(--surface)] shadow-lg ring-2 ring-amber-400/20" : "border-[var(--border)] bg-[var(--surface)]/70 hover:border-amber-400/40"}`} key={c.id}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-black text-base text-[var(--text-primary)]">{c.name}</h4>
                      {c.description && <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{c.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-xl text-amber-400">฿{num(c.price)}</p>
                      <span className="text-[10px] font-black text-[var(--success)] block mt-0.5">{c.days} วัน</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={pending || !listing}
                    onClick={(e) => {
                      e.stopPropagation();
                      order(() => orderBoost(c.id, listing));
                    }}
                    className={`w-full mt-3.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-50 ${on ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md hover:brightness-110 font-black" : "bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-amber-400/20"}`}
                  >
                    เลือกดันประกาศแพ็กเกจนี้ (฿{num(c.price)})
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="px-4 text-[10px] text-[var(--text-secondary)]">ราคารวม VAT แล้ว · ระบบชำระเงินออนไลน์กำลังจะเปิดให้บริการ คำสั่งซื้อจะได้รับการยืนยันโดยทีมงาน</p>
      </div>
    </div>
  );
}
