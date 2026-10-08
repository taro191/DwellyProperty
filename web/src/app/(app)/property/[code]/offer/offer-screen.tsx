"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock4, FilePen, MessageSquare, ShieldCheck } from "lucide-react";
import { makeOffer, startChat } from "@/app/(site)/property/actions";
import { num } from "@/lib/listing-view";

export type OfferProps = {
  property: {
    id: string;
    code: string;
    name: string;
    image: string;
    location: string;
    sizeLabel: string;
    isLand: boolean;
    deedType: string | null;
    salePrice: number | null;
    rentPrice: number | null;
  };
};

/** Make an offer (design: `om`, screen "offer-flow"); rent-only listings offer on the monthly rent. */
export function OfferScreen({ property: A }: OfferProps) {
  const router = useRouter();
  const kinds = [A.salePrice != null && ("purchase" as const), A.rentPrice != null && ("rent" as const)].filter(Boolean) as ("purchase" | "rent")[];
  const [kind, setKind] = useState(kinds[0]);
  const listed = (kind === "purchase" ? A.salePrice : A.rentPrice) ?? 0;
  const [amount, setAmount] = useState(String(Math.round(listed * 0.95)));
  const [validDays, setValidDays] = useState("3");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const offer = Number(amount) || 0;
  const diff = listed - offer;
  const pct = listed > 0 ? ((diff / listed) * 100).toFixed(1) : "0";
  const deposit = Math.round(offer * 0.02);
  const contract = Math.round(offer * 0.08);
  const balance = Math.max(0, offer - deposit - contract);
  const purchase = kind === "purchase";
  const unit = purchase ? "" : "/เดือน";

  const switchKind = (k: "purchase" | "rent") => {
    setKind(k);
    setAmount(String(Math.round(((k === "purchase" ? A.salePrice : A.rentPrice) ?? 0) * 0.95)));
  };
  const submit = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("property_id", A.id);
      fd.set("kind", kind);
      fd.set("offer_price", String(offer));
      fd.set("valid_days", validDays);
      if (note.trim()) fd.set("buyer_note", note.trim());
      const r = await makeOffer(fd);
      if (r.ok) setDone(true);
      else setError(r.error);
    });

  if (done) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-[var(--bg)] pb-10">
        <div className="w-20 h-20 rounded-3xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] mb-5 shadow-2xl">
          <Clock4 className="w-10 h-10" />
        </div>
        <h2 className="font-extrabold text-2xl text-[var(--text-primary)]">ส่งข้อเสนอราคาเรียบร้อยแล้ว</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs leading-relaxed">
          ระบบได้บันทึกข้อเสนอราคาและแจ้งเตือนไปยังผู้ขายเรียบร้อยแล้ว ข้อเสนอมีผล {validDays} วัน
        </p>
        <div className="w-full mt-6 p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-left shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">สรุปข้อเสนอทางการเงินของคุณ</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">สถานะ: รอผู้ขายพิจารณา</span>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between gap-3 py-1 border-b border-[var(--border)]">
              <span className="text-[var(--text-secondary)] shrink-0">อสังหาริมทรัพย์</span>
              <span className="font-bold text-[var(--text-primary)] truncate max-w-[200px]">{A.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">{purchase ? "ราคาตั้งขายเดิม" : "ค่าเช่าตามประกาศ"}</span>
              <span className="text-[var(--text-secondary)]">
                ฿{num(listed)}
                {unit}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">{purchase ? "ราคาที่คุณเสนอซื้อ" : "ค่าเช่าที่คุณเสนอ"}</span>
              <span className="font-black text-base text-[var(--accent)]">
                ฿{num(offer)}
                {unit}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">ส่วนต่างที่คุณขอต่อรอง</span>
              <span className="font-bold text-amber-400">
                {diff >= 0 ? `-฿${num(diff)}` : `+฿${num(Math.abs(diff))}`} ({pct}%)
              </span>
            </div>
            {purchase && (
              <>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">เงินมัดจำจองเบื้องต้น (2%)</span>
                  <span className="font-bold text-[var(--text-primary)]">฿{num(deposit)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">เงินทำสัญญาจะซื้อจะขาย (8%)</span>
                  <span className="font-bold text-[var(--text-primary)]">฿{num(contract)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">ยอดคงเหลือชำระวันโอน (90%)</span>
                  <span className="font-bold text-emerald-400">฿{num(balance)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-1">
              <span className="text-[var(--text-secondary)]">ระยะเวลายืนราคา</span>
              <span className="font-bold text-[var(--text-primary)]">{validDays} วัน</span>
            </div>
          </div>
        </div>
        <div className="w-full flex gap-3 mt-6">
          <form action={startChat} className="flex-1">
            <input type="hidden" name="property_id" value={A.id} />
            <button className="w-full py-3.5 rounded-2xl font-bold text-xs border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] flex items-center justify-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
              เปิดแชทกับผู้ขาย
            </button>
          </form>
          <Link href={`/property/${A.code}`} className="flex-1 py-3.5 rounded-2xl font-bold text-xs bg-[var(--accent)] text-[var(--bg)] shadow-md text-center">
            กลับสู่หน้ารายการ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] bg-[var(--bg)]">
      <div className="flex items-center gap-3 px-4 min-h-14 pt-[env(safe-area-inset-top,0px)] bg-[var(--surface)] border-b border-[var(--border)]">
        <button type="button" onClick={() => router.push(`/property/${A.code}`)} className="p-1 -ml-1 text-[var(--text-secondary)] hover:text-white cursor-pointer" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">ยื่นข้อเสนอราคา (Make an Offer)</h2>
      </div>
      <div className="px-4 pt-4 flex flex-col gap-5">
        <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={A.image} alt="" className="w-14 h-14 rounded-2xl object-cover" />
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-sm text-[var(--text-primary)] truncate">{A.name}</h3>
            <p className="text-xs mt-0.5 font-bold text-[var(--accent)]">
              {purchase ? "ราคาตั้งขาย" : "ค่าเช่า"} ฿{num(listed)}
              {unit} • {A.sizeLabel}
            </p>
            {A.isLand && (
              <span className="text-[10px] font-bold text-amber-400">
                {A.deedType || "ที่ดิน"} • {A.location}
              </span>
            )}
          </div>
        </div>
        {kinds.length > 1 && (
          <div className="grid grid-cols-2 gap-2">
            {kinds.map((k) => (
              <button
                type="button"
                onClick={() => switchKind(k)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${kind === k ? "bg-[var(--accent)] text-[var(--bg)]" : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
                key={k}
              >
                {k === "purchase" ? "เสนอซื้อ" : "เสนอเช่า"}
              </button>
            ))}
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              {purchase ? "ราคาที่คุณต้องการเสนอซื้อ (บาท)" : "ค่าเช่าที่คุณต้องการเสนอ (บาท/เดือน)"}
            </span>
            {offer > 0 && (
              <span className={`text-xs font-extrabold ${diff > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {diff > 0 ? `ลดลง ฿${num(diff)} (-${pct}%)` : diff < 0 ? `เสนอเพิ่ม ฿${num(Math.abs(diff))}` : "ราคาตรงตามประกาศ"}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-[var(--text-secondary)]">฿</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="ราคาที่เสนอ"
              value={amount ? num(Number(amount)) : ""}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="w-full pl-10 pr-4 py-4 rounded-2xl bg-[var(--surface)] text-2xl font-black text-[var(--text-primary)] border border-[var(--border)] focus:border-[var(--accent)] outline-none"
            />
          </div>
          <div className="flex gap-2 mt-3">
            {[
              { label: "ราคาเต็ม", price: listed },
              { label: `-3% (-฿${Math.round((listed * 0.03) / 1e3)}k)`, price: Math.round(listed * 0.97) },
              { label: `-5% (-฿${Math.round((listed * 0.05) / 1e3)}k)`, price: Math.round(listed * 0.95) },
              { label: `-8% (-฿${Math.round((listed * 0.08) / 1e3)}k)`, price: Math.round(listed * 0.92) },
            ].map((q) => (
              <button
                type="button"
                onClick={() => setAmount(String(q.price))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${offer === q.price ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]"}`}
                key={q.label}
              >
                {q.label}
              </button>
            ))}
          </div>
          {purchase && offer > 0 && (
            <div className="mt-3 p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
              <span className="text-[10px] font-black uppercase text-[var(--accent)] tracking-wider block">แผนการชำระเงินตามมาตรฐานสัญญาจะซื้อจะขาย:</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">1. มัดจำจอง (2%)</span>
                  <span className="font-extrabold text-[var(--text-primary)]">฿{num(deposit)}</span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">2. ทำสัญญา (8%)</span>
                  <span className="font-extrabold text-[var(--text-primary)]">฿{num(contract)}</span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">3. วันโอน (90%)</span>
                  <span className="font-extrabold text-emerald-400">฿{num(balance)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">ข้อความเพิ่มเติมถึงผู้ขาย (ไม่บังคับ)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="เช่น สนใจห้องนี้ พร้อมทำสัญญาภายในสัปดาห์นี้..."
            className="w-full px-4 py-3 rounded-2xl bg-[var(--surface)] text-sm text-[var(--text-primary)] border border-[var(--border)] focus:border-[var(--accent)] outline-none resize-none"
          />
        </div>
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">ระยะเวลายืนราคา</span>
          <div className="flex gap-2">
            {["1", "3", "7"].map((v) => (
              <button
                type="button"
                onClick={() => setValidDays(v)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${validDays === v ? "bg-[var(--accent)] text-[var(--bg)]" : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
                key={v}
              >
                {v} วัน
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          <ShieldCheck className="w-5 h-5 text-[var(--success)] flex-shrink-0" />
          <span>ข้อเสนอของคุณจะถูกส่งผ่านระบบและแจ้งเตือนผู้ขายโดยตรงอย่างปลอดภัย ข้อเสนอไม่มีผลผูกพันทางกฎหมายจนกว่าจะทำสัญญา</span>
        </div>
        {error && <p className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">{error}</p>}
      </div>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-[var(--bg)] border-t border-[var(--border)] z-30">
        <button
          type="button"
          disabled={offer <= 0 || pending}
          onClick={submit}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${offer > 0 ? "bg-[var(--accent)] text-[var(--bg)] shadow-lg shadow-[var(--accent)]/20 hover:opacity-90" : "bg-[var(--surface-2)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"}`}
        >
          <FilePen className="w-5 h-5" />
          {pending ? "กำลังส่ง…" : `ส่งข้อเสนอราคา ฿${num(offer)}`}
        </button>
      </div>
    </div>
  );
}
