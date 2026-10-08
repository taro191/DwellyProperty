"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building, Calculator, Check, CheckCircle2, Clock4, Copy, FileText, Info, Receipt, ShieldCheck, TrendingUp, Users, Zap } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { saveCommission, decideCommissionAccess } from "@/app/(site)/dashboard/listings/actions";
import { requestPartnerAccess } from "@/app/(site)/dashboard/agent/actions";
import { num } from "@/lib/listing-view";
import { askListingAccess } from "./actions";

type Tab = "calculator" | "properties" | "permissions" | "expert";
export type OwnerListing = {
  id: string; code: string; title: string; price: string; enabled: boolean; saleRate: number | null; rentRate: number | null; sells: boolean; rents: boolean;
  requests: { id: string; agent: string; code: string | null; status: string; message: string | null; when: string }[];
};
export type AgentProgram = { id: string; code: string; title: string; detail: string };
export type OpenListing = { id: string; code: string; title: string; place: string; request: string | null };

const SALE_M2 = 2.5;
const SALE_M3 = 2;
const RENT = { m1: 100, m2: 80, m3: 75, renew: 50 };
const tabs: { id: Tab; label: string; icon: typeof Calculator }[] = [
  { id: "calculator", label: "คำนวณอัตรา", icon: Calculator },
  { id: "properties", label: "ทรัพย์สิน", icon: Building },
  { id: "permissions", label: "การอนุญาต", icon: ShieldCheck },
  { id: "expert", label: "สัญญา", icon: FileText },
];
const card = "p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm";
const pick = (on: boolean) =>
  `p-2.5 rounded-2xl border transition-all text-left cursor-pointer ${on ? "bg-[var(--accent)] text-[var(--bg)] font-bold border-[var(--accent)] shadow-sm" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]"}`;
const input = "w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]";

/** Dwelly Commission (design: `bm`, screen "dwelly-commission"). Access comes from real approvals, not typed codes. */
export function CommissionScreen({
  mode, partner, ownerListings, programs, open, initialTab,
}: {
  mode: "owner" | "agent";
  partner: "approved" | "pending" | "rejected" | "revoked" | null;
  ownerListings: OwnerListing[];
  programs: AgentProgram[];
  open: OpenListing[];
  initialTab: Tab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [deal, setDeal] = useState<"sale" | "rent">("sale");
  const [price, setPrice] = useState(3.2e6);
  const [rate, setRate] = useState(5);
  const [rent, setRent] = useState(15e3);
  const [month, setMonth] = useState<"m1" | "m2" | "m3">("m1");
  const [vat, setVat] = useState(false);
  const [coBroke, setCoBroke] = useState(false);
  const [split, setSplit] = useState(50);
  const [interest, setInterest] = useState(4.5);
  const [fee, setFee] = useState(1500);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const saleTier = { m1: (price * rate) / 100, m2: (price * SALE_M2) / 100, m3: (price * SALE_M3) / 100 };
  const rentTier = { m1: (rent * RENT.m1) / 100, m2: (rent * RENT.m2) / 100, m3: (rent * RENT.m3) / 100 };
  const base = Math.round(deal === "sale" ? saleTier[month] : rentTier[month]);
  const vatAmt = vat ? Math.round(base * 0.07) : 0;
  const wht = Math.round(base * 0.03);
  const net = base + vatAmt - wht;
  const listing = Math.round(base * (split / 100));
  const selling = base - listing;
  const holding = Math.round((price * (interest / 100)) / 12 + fee);
  const ownerNet = { m1: Math.round(price - saleTier.m1 - holding), m2: Math.round(price - saleTier.m2 - holding * 2), m3: Math.round(price - saleTier.m3 - holding * 4) };
  const rentYear = { m1: Math.round(rent * 11 - rentTier.m1), m2: Math.round(rent * 10 - rentTier.m2), m3: Math.round(rent * 9 - rentTier.m3) };
  const contract = `สัญญามาตรฐานข้อตกลงอัตรา Dwelly Dynamic Commission (อัตราลดหลั่นตามเวลา)
วันที่ทำสัญญา: ${new Date().toLocaleDateString("th-TH")}
ประเภทสิทธิ์: ${mode === "owner" ? "เจ้าของทรัพย์อนุญาตนายหน้าเป็นรายประกาศ" : "นายหน้าที่ได้รับอนุญาตผ่าน Dwelly"}
คู่สัญญา: เจ้าของทรัพย์สิน และ ตัวแทนจำหน่ายที่ได้รับอนุญาต

1. เงื่อนไขการขาย (Sale Commission):
- ปิดการขายได้ภายใน 1 เดือนแรก (1-30 วัน): ค่าคอมมิชชั่นตามตกลง ${rate}%
- ปิดการขายได้ในเดือนที่ 2 (31-60 วัน): ค่าคอมมิชชั่น ${SALE_M2}%
- ปิดการขายเกินกว่า 3 เดือนขึ้นไป: ค่าคอมมิชชั่น ${SALE_M3}%

2. เงื่อนไขการเช่า (Rental Commission):
- ปล่อยเช่าได้ภายใน 1 เดือนแรก: ค่าคอมมิชชั่น ${RENT.m1}% ของค่าเช่า 1 เดือน
- ปล่อยเช่าได้ในเดือนที่ 2: ค่าคอมมิชชั่น ${RENT.m2}% ของค่าเช่า 1 เดือน
- ปล่อยเช่าเกินกว่า 3 เดือน: ค่าคอมมิชชั่น ${RENT.m3}% ของค่าเช่า 1 เดือน
- กรณีต่อสัญญาเช่า (Lease Renewal): ค่าคอมมิชชั่น ${RENT.renew}% ของค่าเช่า 1 เดือน

*หมายเหตุ: ข้อมูลนี้แสดงเฉพาะเจ้าของทรัพย์และนายหน้าที่ได้รับอนุญาตเท่านั้น ผู้ซื้อและผู้เช่าจะไม่เห็นข้อมูลส่วนนี้`;

  const ask = (id: string) =>
    startTransition(async () => {
      const r = await askListingAccess(id);
      setNotice(r.ok ? (r.message ?? "ส่งคำขอแล้ว") : r.error);
      router.refresh();
    });
  const tier = (key: "m1" | "m2" | "m3", n: number, title: string, pct: string, amount: number, first = false) => (
    <button
      type="button"
      onClick={() => setMonth(key)}
      className={`w-full text-left p-4 rounded-3xl cursor-pointer transition-all ${month === key ? "bg-gradient-to-r from-[var(--surface)] to-[#152e1d] border-2 border-[var(--accent)] shadow-md" : "bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50"}`}
      key={key}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${first ? "bg-[var(--accent)] text-[var(--bg)]" : "bg-[var(--surface-2)] text-[var(--text-secondary)]"}`}>{n}</span>
          <h4 className="font-extrabold text-sm text-[var(--text-primary)]">{title}</h4>
        </div>
        {first ? (
          <span className="bg-[var(--accent)] text-[var(--bg)] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Zap className="w-3 h-3 fill-current" /> ปิดเร็วสุด • {pct}
          </span>
        ) : (
          <span className="text-xs font-black text-[var(--text-secondary)] px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] shrink-0">{pct}</span>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <div>
          <span className="text-[10px] text-[var(--text-secondary)]">ค่านายหน้าฐาน (ก่อนภาษี)</span>
          <p className={`${first ? "text-xl text-[var(--accent)]" : "text-base text-[var(--text-primary)]"} font-black`}>
            ฿{num(Math.round(amount))} <span className="text-xs font-normal text-[var(--text-secondary)]">บาท</span>
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${month === key ? "bg-[var(--accent)] text-[var(--bg)]" : "bg-[var(--surface-2)] text-[var(--text-secondary)]"}`}>
          {month === key ? "✓ เลือกดูภาษีระดับนี้" : "คลิกเลือก"}
        </span>
      </div>
    </button>
  );

  return (
    <div className="min-h-dvh pb-28 bg-[var(--bg)]">
      <div className="px-4 pt-3 pb-2">
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#122b1c] to-[var(--surface)] border border-[var(--accent)]/40 shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center font-black shrink-0">⚡</span>
            <div className="min-w-0">
              <h3 className="font-black text-sm text-[var(--text-primary)]">Dwelly Dynamic Commission</h3>
              <p className="text-[11px] text-[var(--accent)] font-semibold">
                {mode === "owner"
                  ? "สิทธิ์แบบที่ 2: เจ้าของทรัพย์กำหนดอัตราและอนุมัตินายหน้าเอง"
                  : partner === "approved"
                    ? "สิทธิ์แบบที่ 1: ✓ ได้รับอนุญาตจาก Dwelly Property (Partner)"
                    : partner === "pending"
                      ? "คำขอสิทธิ์ Partner อยู่ระหว่างตรวจสอบ"
                      : "ขอสิทธิ์ Partner หรือขอสิทธิ์รายประกาศเพื่อดูอัตราค่าคอมฯ"}
              </p>
            </div>
          </div>
        </div>
      </div>
      {notice && (
        <div className="mx-4 my-2 p-3 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)] text-[var(--accent)] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      <div className="px-4 mt-2">
        <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                type="button"
                onClick={() => setTab(t.id)}
                className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-extrabold flex items-center justify-center gap-1 transition-all min-w-0 cursor-pointer ${tab === t.id ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                key={t.id}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "calculator" && (
        <div className="px-4 mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            {(
              [
                ["sale", "ขาย (Sale)", `เดือนแรก 3-10% → ${SALE_M2}% → ${SALE_M3}%`, TrendingUp],
                ["rent", "เช่า (Rental)", `${RENT.m1}% → ${RENT.m2}% → ${RENT.m3}%`, Clock4],
              ] as const
            ).map(([id, title, sub, Icon]) => (
              <button
                type="button"
                onClick={() => setDeal(id)}
                className={`p-2.5 rounded-xl text-left transition-all min-w-0 cursor-pointer ${deal === id ? "bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"}`}
                key={id}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4 shrink-0 text-[var(--accent)]" />
                  <span className="font-extrabold text-xs truncate text-[var(--text-primary)]">{title}</span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate font-medium">{sub}</p>
              </button>
            ))}
          </div>
          {deal === "sale" ? (
            <div className={`${card} space-y-4`}>
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold block mb-1.5">เลือกตัวอย่างเพื่อจำลองค่าคอมมิชชั่น:</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {(
                    [
                      [2.35e6, 5, "🏢 คอนโด 1 นอน (฿2.35M)"],
                      [4.8e6, 5, "🏞️ ที่ดิน 200 ตร.ว. (฿4.8M)"],
                      [14e6, 4, "🏞️ ที่ดิน 1 ไร่ (฿14M)"],
                      [45e6, 3.5, "🏞️ ที่ดิน 5 ไร่ใหญ่ (฿45M)"],
                    ] as const
                  ).map(([p, r, l]) => (
                    <button
                      type="button"
                      onClick={() => {
                        setPrice(p);
                        setRate(r);
                      }}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${price === p ? "bg-[var(--accent)] text-[var(--bg)] font-bold border-[var(--accent)]" : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white border-[var(--border)]"}`}
                      key={l}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-[var(--text-secondary)]">ราคาตั้งขาย (บาท)</span>
                  <span className="font-black text-sm text-[var(--accent)]">฿{num(price)}</span>
                </div>
                <input type="range" min="1000000" max="50000000" step="500000" value={price} onChange={(e) => setPrice(Number(e.target.value))} aria-label="ราคาตั้งขาย" className="w-full accent-[var(--accent)] cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-[var(--text-secondary)]">อัตราเดือนแรก (กำหนดได้ 3 - 10%)</span>
                  <span className="font-black text-sm text-[var(--accent)]">{rate}%</span>
                </div>
                <div className="flex gap-1.5">
                  {[3, 4, 5, 7, 10].map((r) => (
                    <button
                      type="button"
                      onClick={() => setRate(r)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${rate === r ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)]"}`}
                      key={r}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={`${card} space-y-4`}>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-[var(--text-secondary)]">ค่าเช่ารายเดือน (บาท)</span>
                <span className="font-black text-sm text-[var(--accent)]">฿{num(rent)}</span>
              </div>
              <input type="range" min="5000" max="150000" step="1000" value={rent} onChange={(e) => setRent(Number(e.target.value))} aria-label="ค่าเช่ารายเดือน" className="w-full accent-[var(--accent)] cursor-pointer" />
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">อัตราคอมมิชชั่นตามระยะเวลา:</span>
              <span className="text-[10px] text-[var(--accent)] font-bold">กำลังเลือก: เดือนที่ {month === "m1" ? "1" : month === "m2" ? "2" : "3+"}</span>
            </div>
            {deal === "sale" ? (
              <>
                {tier("m1", 1, "1 เดือนแรก (วันที่ 1 - 30)", `${rate}%`, saleTier.m1, true)}
                {tier("m2", 2, "เดือนที่ 2 (วันที่ 31 - 60)", `${SALE_M2}%`, saleTier.m2)}
                {tier("m3", 3, "เดือนที่ 3 เป็นต้นไป (61 วัน+)", `${SALE_M3}%`, saleTier.m3)}
              </>
            ) : (
              <>
                {tier("m1", 1, "1 เดือนแรก (วันที่ 1 - 30)", `${RENT.m1}%`, rentTier.m1, true)}
                {tier("m2", 2, "เดือนที่ 2 (วันที่ 31 - 60)", `${RENT.m2}%`, rentTier.m2)}
                {tier("m3", 3, "เดือนที่ 3 เป็นต้นไป", `${RENT.m3}%`, rentTier.m3)}
                <div className="p-4 rounded-3xl bg-gradient-to-r from-[var(--surface)] to-[#201d15] border border-amber-500/30 shadow-sm">
                  <h4 className="font-extrabold text-sm text-[var(--text-primary)]">
                    ต่อสัญญาเช่า (Lease Renewal): {RENT.renew}% (฿{num(Math.round((rent * RENT.renew) / 100))})
                  </h4>
                </div>
              </>
            )}
          </div>
          <div className={`${card} space-y-3.5`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[var(--text-primary)]">ระบบคำนวณภาษี & ยอดโอนสุทธิ (Tax & Net Payout)</h4>
                <p className="text-[10px] text-[var(--text-secondary)]">ภาษีเงินได้หัก ณ ที่จ่าย 3% และ VAT 7% ตามประมวลรัษฎากร</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button type="button" onClick={() => setVat(false)} className={pick(!vat)}>
                <span className="block font-bold">👤 บุคคลธรรมดา</span>
                <span className="block text-[10px] font-normal opacity-90">หัก ณ ที่จ่าย 3% (ภ.ง.ด.3) • ไม่มี VAT</span>
              </button>
              <button type="button" onClick={() => setVat(true)} className={pick(vat)}>
                <span className="block font-bold">🏢 นิติบุคคล / จด VAT</span>
                <span className="block text-[10px] font-normal opacity-90">บวก VAT 7% • หัก ณ ที่จ่าย 3% (ภ.ง.ด.53)</span>
              </button>
            </div>
            <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border)]/60">
                <span className="text-[var(--text-secondary)]">1. ค่านายหน้าฐาน (Base Commission)</span>
                <span className="font-bold text-[var(--text-primary)]">฿{num(base)}</span>
              </div>
              {vat && (
                <>
                  <div className="flex justify-between py-1 border-b border-[var(--border)]/60">
                    <span className="text-[var(--text-secondary)]">2. ภาษีมูลค่าเพิ่ม VAT 7% (+)</span>
                    <span className="font-bold text-emerald-400">+฿{num(vatAmt)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border)]/60">
                    <span className="text-[var(--text-secondary)]">3. ยอดรวมตามใบแจ้งหนี้ (Invoiced Total)</span>
                    <span className="font-bold text-white">฿{num(base + vatAmt)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-1 border-b border-[var(--border)]/60">
                <span className="text-[var(--text-secondary)]">{vat ? "4." : "2."} ภาษีเงินได้หัก ณ ที่จ่าย 3% (-)</span>
                <span className="font-bold text-rose-400">-฿{num(wht)}</span>
              </div>
              <div className="pt-2 flex justify-between items-baseline font-black">
                <span className="text-xs text-[var(--text-primary)]">ยอดเงินโอนสุทธิที่นายหน้าได้รับ:</span>
                <span className="text-xl text-[var(--accent)] font-extrabold">฿{num(net)}</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                เจ้าของต้องหักภาษี ณ ที่จ่าย <strong>฿{num(wht)} บาท</strong> และออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (ใบ 50 ทวิ) ให้นายหน้า
              </span>
            </div>
          </div>
          <div className={`${card} space-y-3.5`}>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[var(--text-primary)]">เครื่องคำนวณส่วนแบ่ง Co-Broker</h4>
                  <p className="text-[10px] text-[var(--text-secondary)]">แบ่งผลตอบแทนระหว่าง Listing Agent และ Selling Agent</p>
                </div>
              </div>
              <input type="checkbox" checked={coBroke} onChange={(e) => setCoBroke(e.target.checked)} className="w-5 h-5 accent-[var(--accent)] cursor-pointer" />
            </label>
            {coBroke && (
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                  {[50, 60, 70].map((s) => (
                    <button
                      type="button"
                      onClick={() => setSplit(s)}
                      className={`p-2 rounded-xl text-center transition-all cursor-pointer ${split === s ? "bg-[var(--accent)] text-[var(--bg)] shadow-xs" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
                      key={s}
                    >
                      <span className="block font-black">
                        {s} : {100 - s}
                      </span>
                      <span className="block text-[9px] font-normal opacity-85 truncate">{s === 50 ? "คนละครึ่ง (มาตรฐาน)" : `ฝั่งทรัพย์ ${s}%`}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      ["🏡 ตัวแทนฝั่งทรัพย์", split, listing],
                      ["🤝 Co-Broker ฝั่งซื้อ", 100 - split, selling],
                    ] as const
                  ).map(([l, p, v]) => (
                    <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1" key={l}>
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                        {l} ({p}%)
                      </span>
                      <span className="text-base font-black text-white block">฿{num(v)}</span>
                      <span className="text-[10px] text-amber-400 block">หัก 3%: -฿{num(Math.round(v * 0.03))}</span>
                      <div className="pt-1 border-t border-[var(--border)] flex justify-between font-bold text-[11px]">
                        <span className="text-[var(--text-secondary)]">สุทธิ:</span>
                        <span className="text-[var(--accent)]">฿{num(v - Math.round(v * 0.03))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className={`${card} space-y-3`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[var(--text-primary)]">วิเคราะห์ผลตอบแทนสุทธิของเจ้าของ (Owner Net Proceeds)</h4>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  {deal === "sale" ? "ปิดเร็วเดือนแรก vs ขายช้าเดือนที่ 3 เจ้าของได้เงินสุทธิต่างกันอย่างไร" : "ค่าเสียโอกาสจากห้องว่างและรายรับสุทธิปีแรก"}
                </p>
              </div>
            </div>
            {deal === "sale" && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
                <label className="text-xs">
                  <span className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                    ดอกเบี้ยเงินกู้ (% ต่อปี) <b className="text-[var(--accent)]">{interest}%</b>
                  </span>
                  <input type="range" min="0" max="8" step="0.5" value={interest} onChange={(e) => setInterest(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
                </label>
                <label className="text-xs">
                  <span className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                    ค่าส่วนกลาง/เดือน <b className="text-[var(--accent)]">฿{num(fee)}</b>
                  </span>
                  <input type="range" min="0" max="10000" step="250" value={fee} onChange={(e) => setFee(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
                </label>
              </div>
            )}
            <div className="space-y-2 text-xs">
              {(
                deal === "sale"
                  ? [
                      ["ปิดได้เดือนแรก (ถือครอง 1 เดือน)", ownerNet.m1],
                      ["ปิดได้เดือนที่ 2 (ถือครอง 2 เดือน)", ownerNet.m2],
                      ["ปิดได้เดือนที่ 3+ (ถือครอง 4 เดือน)", ownerNet.m3],
                    ]
                  : [
                      ["ได้ผู้เช่าเดือนแรก (รายรับ 11 เดือน)", rentYear.m1],
                      ["ได้ผู้เช่าเดือนที่ 2 (รายรับ 10 เดือน)", rentYear.m2],
                      ["ได้ผู้เช่าเดือนที่ 3+ (รายรับ 9 เดือน)", rentYear.m3],
                    ]
              ).map(([l, v], i) => (
                <div className={`flex justify-between p-2.5 rounded-xl ${i === 0 ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-[var(--surface-2)] border border-[var(--border)]"}`} key={l as string}>
                  <span className="text-[var(--text-secondary)]">{l}</span>
                  <span className={`font-black ${i === 0 ? "text-emerald-400" : "text-[var(--text-primary)]"}`}>฿{num(v as number)}</span>
                </div>
              ))}
              <p className="text-[10px] text-[var(--text-secondary)]">
                {deal === "sale"
                  ? `ปิดเร็วได้สุทธิมากกว่า ฿${num(ownerNet.m1 - ownerNet.m3)} แม้ค่าคอมฯ เดือนแรกสูงกว่า เพราะประหยัดต้นทุนถือครอง ~฿${num(holding)}/เดือน`
                  : `ได้ผู้เช่าเร็วได้รายรับปีแรกมากกว่า ฿${num(rentYear.m1 - rentYear.m3)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "properties" && (
        <div className="px-4 mt-4 space-y-3">
          {mode === "owner" ? (
            <>
              <p className="text-xs text-[var(--text-secondary)]">เปิด/ปิดโปรแกรม Co-Agent และกำหนดอัตราค่าคอมฯ ของแต่ละประกาศ (นายหน้าเห็นอัตราเมื่อได้รับอนุญาตเท่านั้น)</p>
              {ownerListings.map((l) => (
                <ActionForm action={saveCommission} className={`${card} space-y-3`} key={l.id}>
                  <input type="hidden" name="property_id" value={l.id} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/property/${l.code}`} className="font-extrabold text-sm text-[var(--text-primary)] truncate block hover:text-[var(--accent)]">
                        {l.title}
                      </Link>
                      <p className="text-xs text-[var(--accent)] font-bold">{l.price}</p>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)] shrink-0 cursor-pointer">
                      <input type="checkbox" name="enabled" defaultChecked={l.enabled} className="w-4 h-4 accent-[var(--accent)]" />
                      เปิดรับ Co-Agent
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {l.sells && (
                      <label>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">ค่าคอมฯ ขาย (% เดือนแรก)</span>
                        <input name="sale_rate_pct" type="number" min={0} max={10} step={0.5} defaultValue={l.saleRate ?? 3} className={input} />
                      </label>
                    )}
                    {l.rents && (
                      <label>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">ค่าคอมฯ เช่า (% ของค่าเช่า 1 เดือน)</span>
                        <input name="rent_month1_rate_pct" type="number" min={0} max={300} step={5} defaultValue={l.rentRate ?? 100} className={input} />
                      </label>
                    )}
                  </div>
                  <SubmitButton plain className="w-full py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)] disabled:opacity-60">
                    บันทึกการตั้งค่า
                  </SubmitButton>
                </ActionForm>
              ))}
              {ownerListings.length === 0 && <p className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">ยังไม่มีประกาศของคุณ</p>}
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-[var(--text-secondary)]">ทรัพย์ที่คุณได้รับสิทธิ์ Co-Agent ({programs.length})</p>
              {programs.map((p) => (
                <Link href={`/property/${p.code}`} className={`${card} block`} key={p.id}>
                  <h4 className="font-extrabold text-sm text-[var(--text-primary)] truncate">{p.title}</h4>
                  <p className="text-xs text-[var(--accent)] font-bold mt-0.5">{p.detail}</p>
                </Link>
              ))}
              <p className="text-xs font-bold text-[var(--text-secondary)] pt-2">ประกาศที่เปิดรับ Co-Agent (ขอสิทธิ์เพื่อดูอัตรา)</p>
              {open.map((o) => (
                <div className={`${card} flex items-center justify-between gap-3`} key={o.id}>
                  <div className="min-w-0">
                    <Link href={`/property/${o.code}`} className="font-extrabold text-sm text-[var(--text-primary)] truncate block">
                      {o.title}
                    </Link>
                    <p className="text-[11px] text-[var(--text-secondary)]">{o.place}</p>
                  </div>
                  {o.request ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${o.request === "approved" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                      {o.request === "approved" ? "ได้รับสิทธิ์" : o.request === "pending" ? "รอเจ้าของอนุมัติ" : "ไม่ผ่าน"}
                    </span>
                  ) : (
                    <button type="button" disabled={pending} onClick={() => ask(o.id)} className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] text-xs font-black shrink-0 disabled:opacity-60">
                      ขอสิทธิ์
                    </button>
                  )}
                </div>
              ))}
              {open.length === 0 && <p className="text-xs text-[var(--text-secondary)]">ยังไม่มีประกาศเปิดรับเพิ่มเติม</p>}
            </>
          )}
        </div>
      )}

      {tab === "permissions" && (
        <div className="px-4 mt-4 space-y-3">
          {mode === "owner" ? (
            <>
              <h3 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                คำขอสิทธิ์ Co-Agent จากนายหน้า
              </h3>
              {ownerListings.flatMap((l) =>
                l.requests.map((r) => (
                  <div className={`${card} space-y-2`} key={r.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-[var(--text-primary)]">
                          {r.agent} {r.code && <span className="text-[10px] font-mono text-emerald-400">{r.code}</span>}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {l.title} • {r.when}
                        </p>
                        {r.message && <p className="text-xs text-[var(--text-primary)] mt-1">💬 {r.message}</p>}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${r.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : r.status === "pending" ? "bg-amber-500/15 text-amber-400" : "bg-[var(--surface-2)] text-[var(--text-secondary)]"}`}
                      >
                        {r.status === "approved" ? "อนุมัติแล้ว" : r.status === "pending" ? "รอพิจารณา" : r.status === "rejected" ? "ปฏิเสธ" : "ยกเลิกแล้ว"}
                      </span>
                    </div>
                    {(r.status === "pending" || r.status === "approved") && (
                      <ActionForm action={decideCommissionAccess} className="flex gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        {r.status === "pending" ? (
                          <>
                            <SubmitButton plain name="status" value="approved" className="flex-1 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)]">
                              อนุมัติ
                            </SubmitButton>
                            <SubmitButton plain name="status" value="rejected" className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)]">
                              ปฏิเสธ
                            </SubmitButton>
                          </>
                        ) : (
                          <SubmitButton plain name="status" value="revoked" className="py-2 px-3 rounded-xl text-xs font-semibold text-rose-400">
                            ยกเลิกสิทธิ์
                          </SubmitButton>
                        )}
                      </ActionForm>
                    )}
                  </div>
                )),
              )}
              {ownerListings.every((l) => l.requests.length === 0) && (
                <p className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">ยังไม่มีคำขอสิทธิ์จากนายหน้า</p>
              )}
            </>
          ) : (
            <div className={`${card} space-y-3`}>
              <h4 className="font-extrabold text-xs text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                สิทธิ์แบบที่ 1: Dwelly Commission Partner
              </h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Partner ที่ทีมงานตรวจใบอนุญาตแล้ว จะเห็นอัตราค่าคอมฯ ของทุกประกาศที่เปิดรับ Co-Agent โดยไม่ต้องขอทีละประกาศ
              </p>
              {partner === "approved" ? (
                <p className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">✓ คุณเป็น Partner แล้ว</p>
              ) : partner === "pending" ? (
                <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400">คำขออยู่ระหว่างตรวจสอบ</p>
              ) : (
                <ActionForm action={requestPartnerAccess} className="space-y-2">
                  <textarea name="message" rows={3} maxLength={1000} placeholder="แนะนำตัว ประสบการณ์ ทำเลที่ดูแล" className={`${input} resize-none`} />
                  <SubmitButton plain className="w-full py-2.5 rounded-xl text-xs font-black bg-[var(--accent)] text-[var(--bg)]">
                    ขอสิทธิ์ Partner
                  </SubmitButton>
                </ActionForm>
              )}
              <p className="text-[10px] text-[var(--text-secondary)]">สิทธิ์แบบที่ 2: ขอสิทธิ์รายประกาศจากเจ้าของได้ที่แท็บ &quot;ทรัพย์สิน&quot;</p>
            </div>
          )}
        </div>
      )}

      {tab === "expert" && (
        <div className="px-4 mt-4 space-y-3">
          <div className={`${card} space-y-3`}>
            <h4 className="font-extrabold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[var(--accent)]" />
              สัญญามาตรฐาน Dwelly Dynamic Commission
            </h4>
            <textarea readOnly value={contract} rows={16} className="w-full p-3 text-[11px] leading-relaxed rounded-2xl bg-black/40 border border-[var(--border)] text-[var(--text-secondary)] font-mono resize-none" />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(contract);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />}
              {copied ? "คัดลอกแล้ว" : "คัดลอกสัญญา"}
            </button>
            <p className="text-[10px] text-[var(--text-secondary)]">*เป็นแบบร่างอ้างอิง ควรให้ที่ปรึกษากฎหมายตรวจก่อนลงนามจริง</p>
          </div>
        </div>
      )}
    </div>
  );
}
