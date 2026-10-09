"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Building2, Check, Copy, QrCode, Send, ShieldCheck, Sparkles, Star, X } from "lucide-react";
import { num } from "@/lib/listing-view";
import { chatWithAgent } from "./actions";

type Deal = { id: string; code: string; title: string; image: string | null; place: string; price: number; rent: boolean; date: string };
type Agent = {
  code: string; name: string; english: string | null; title: string | null; company: string | null; avatar: string | null; bio: string | null;
  kyc: boolean; license: string | null; years: number | null; closedDeals: number; rating: number; ratingCount: number; zones: string[]; categories: string[];
};
type Review = { id: string; author: string; rating: number; body: string | null; date: string };

/** Public agent profile (design: `vm`). Only verified facts are shown; nothing is invented. */
export function AgentProfileScreen({ agent: a, closed, active, reviews, url, isSelf }: { agent: Agent; closed: Deal[]; active: Deal[]; reviews: Review[]; url: string; isSelf: boolean }) {
  const [tab, setTab] = useState<"verification" | "listings" | "portfolio" | "reviews">("verification");
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  const verified = a.kyc && Boolean(a.license);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(a.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&margin=10`;
  const card = (k: Deal, done: boolean) => (
    <Link href={`/property/${k.code}`} className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex gap-3 hover:border-[var(--accent)]/50 transition-colors" key={k.id}>
      {k.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={k.image} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-20 h-20 rounded-xl bg-[var(--surface-2)] shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-extrabold text-xs text-[var(--text-primary)] truncate">{k.title}</h4>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          {k.place} {done && `• ${k.date}`}
        </p>
        <p className={`text-sm font-black mt-1 ${done ? "text-emerald-400" : "text-[var(--accent)]"}`}>
          ฿{num(k.price)}
          {k.rent && <span className="text-[10px] font-normal text-[var(--text-secondary)]">/เดือน</span>}
        </p>
        {done && <span className="text-[10px] font-bold text-emerald-400">✓ {k.rent ? "ปล่อยเช่าแล้ว" : "ขายแล้ว"}</span>}
      </div>
    </Link>
  );

  return (
    <div className="min-h-dvh pb-safe-nav bg-[var(--bg)]">
      <div className="px-4 mt-3">
        <div className="relative rounded-3xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-xl">
          <div className="h-32 w-full relative bg-gradient-to-r from-emerald-900 to-teal-900">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-black/30" />
            {verified && (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-black shadow-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                DWELLY VERIFIED
              </span>
            )}
          </div>
          <div className="px-4.5 pb-5 pt-0 relative">
            <div className="flex flex-col items-start justify-between gap-3 -mt-12">
              <div className="relative">
                <div className="w-22 h-22 rounded-2xl overflow-hidden border-3 border-[var(--surface)] shadow-xl bg-[var(--surface-2)] flex items-center justify-center">
                  {a.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-black text-3xl text-[var(--accent)]">{a.name.charAt(0)}</span>
                  )}
                </div>
                {a.kyc && (
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-xl bg-emerald-500 text-black shadow-lg">
                    <BadgeCheck className="w-4.5 h-4.5 stroke-[2.5]" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold">รหัสประจำตัว:</span>
                  <span className="font-mono text-xs font-black text-[var(--accent)]">{a.code}</span>
                  <button type="button" onClick={copy} className="text-[var(--text-secondary)] hover:text-white p-0.5 ml-0.5" aria-label="คัดลอกรหัส">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {isSelf ? (
                  <Link href="/dashboard/agent/profile" className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-extrabold">
                    แก้ไขโปรไฟล์
                  </Link>
                ) : (
                  <form action={chatWithAgent}>
                    <input type="hidden" name="code" value={a.code} />
                    <button type="submit" className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] text-xs font-extrabold hover:brightness-110 shadow-md flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      ติดต่อ / ฝากขาย
                    </button>
                  </form>
                )}
              </div>
            </div>
            <div className="mt-3.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-xl text-[var(--text-primary)]">{a.name}</h1>
                {a.english && <span className="text-xs text-[var(--text-secondary)] font-medium">({a.english})</span>}
              </div>
              {a.title && <p className="text-xs font-semibold text-emerald-400 mt-0.5">{a.title}</p>}
              {a.company && (
                <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 mt-1">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
                  {a.company}
                </p>
              )}
            </div>
            {a.bio && (
              <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--surface-2)]/50 p-3 rounded-2xl border border-[var(--border)]/60">&quot;{a.bio}&quot;</p>
            )}
            <div className="mt-4 pt-3.5 border-t border-[var(--border)] grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <p className="text-[10px] text-[var(--text-secondary)] font-medium">ปิดการขายแล้ว</p>
                <p className="text-sm font-black text-emerald-400 mt-0.5">{a.closedDeals} ดีล</p>
              </div>
              <div className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <p className="text-[10px] text-[var(--text-secondary)] font-medium">คะแนนรีวิว</p>
                <p className="text-sm font-black text-amber-400 mt-0.5 flex items-center justify-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {a.ratingCount ? a.rating.toFixed(1) : "–"}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <p className="text-[10px] text-[var(--text-secondary)] font-medium">ประสบการณ์</p>
                <p className="text-sm font-black text-[var(--accent)] mt-0.5">{a.years != null ? `${a.years} ปี` : "–"}</p>
              </div>
              <div className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <p className="text-[10px] text-[var(--text-secondary)] font-medium">ประกาศอยู่</p>
                <p className="text-sm font-black text-purple-400 mt-0.5">{active.length} รายการ</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 mt-3">
        <button
          type="button"
          onClick={() => setQr(true)}
          className="w-full text-left relative overflow-hidden p-3.5 rounded-3xl bg-gradient-to-br from-[#0c2415] via-[var(--surface)] to-[#112718] border border-emerald-500/50 shadow-lg cursor-pointer hover:border-emerald-400 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0 p-2 bg-white rounded-2xl shadow-md border-2 border-emerald-500/60 group-hover:scale-105 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="" width={72} height={72} className="w-[72px] h-[72px]" />
              <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-lg text-black shadow-md flex items-center justify-center">
                <QrCode className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-black tracking-wider uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 fill-current" />
                  UNIQUE QR PASSPORT
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400">{a.code}</span>
              </div>
              <h3 className="font-black text-xs text-[var(--text-primary)] mt-1.5 flex items-center gap-1">
                สแกนยืนยันตัวตนจริง & สถิติ
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">สแกน QR เพื่อเปิดหน้านี้ ดูสถานะ KYC บัตรนายหน้า และรายการปิดการขายจริง</p>
            </div>
          </div>
        </button>
      </div>
      <div className="flex gap-2 px-4 mt-4 border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        {(
          [
            ["verification", "✓ ยืนยันตัวตน (KYC & บัตร)"],
            ["listings", `ประกาศ (${active.length})`],
            ["portfolio", `สถิติปิดการขาย (${closed.length})`],
            ["reviews", `รีวิว (${reviews.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 px-3.5 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${tab === id ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-white"}`}
            key={id}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "verification" && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          <div className={`p-4 rounded-2xl shadow-md border ${verified ? "bg-gradient-to-br from-[#102518] to-[var(--surface)] border-emerald-500/40" : "bg-[var(--surface)] border-[var(--border)]"}`}>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xs font-black text-[var(--text-primary)]">
                  สถานะการยืนยันตัวตน: {verified ? "ผ่านการตรวจสอบครบถ้วน" : a.kyc || a.license ? "ผ่านการตรวจสอบบางส่วน" : "ยังไม่ได้ยืนยัน"}
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">บัตรนายหน้า: {a.license ?? "ยังไม่ยืนยัน"}</p>
              </div>
            </div>
          </div>
          {[
            ["ยืนยันตัวตน (KYC)", a.kyc],
            ["ใบอนุญาต / บัตรนายหน้า", Boolean(a.license)],
          ].map(([l, ok]) => (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xs" key={l as string}>
              <span className="text-[var(--text-secondary)]">{l}</span>
              <span className={`font-bold ${ok ? "text-emerald-400" : "text-[var(--text-secondary)]"}`}>{ok ? "✓ ตรวจสอบแล้ว" : "ยังไม่ยืนยัน"}</span>
            </div>
          ))}
          {(a.zones.length > 0 || a.categories.length > 0) && (
            <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-wrap gap-1.5">
              {[...a.zones, ...a.categories].map((t) => (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/30" key={t}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === "listings" && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {active.map((k) => card(k, false))}
          {active.length === 0 && <p className="text-xs text-[var(--text-secondary)] text-center py-6">ยังไม่มีประกาศที่เปิดอยู่</p>}
        </div>
      )}
      {tab === "portfolio" && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {closed.map((k) => card(k, true))}
          {closed.length === 0 && <p className="text-xs text-[var(--text-secondary)] text-center py-6">ยังไม่มีรายการปิดการขายบน Dwelly</p>}
        </div>
      )}
      {tab === "reviews" && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {reviews.map((k) => (
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2" key={k.id}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-[var(--text-primary)]">{k.author}</span>
                  <p className="text-[10px] text-[var(--text-secondary)]">{k.date}</p>
                </div>
                <div className="flex text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs font-bold ml-1">{k.rating}</span>
                </div>
              </div>
              {k.body && <p className="text-xs text-[var(--text-secondary)] leading-relaxed">&quot;{k.body}&quot;</p>}
            </div>
          ))}
          {reviews.length === 0 && <p className="text-xs text-[var(--text-secondary)] text-center py-6">ยังไม่มีรีวิว</p>}
        </div>
      )}
      {qr && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setQr(false)}>
          <div className="w-full max-w-xs p-5 rounded-3xl bg-[var(--surface)] border border-emerald-500/40 text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-emerald-400">UNIQUE QR PASSPORT</span>
              <button type="button" onClick={() => setQr(false)} aria-label="ปิด" className="text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-white rounded-2xl inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt={`QR ${a.code}`} className="w-48 h-48" />
            </div>
            <p className="font-black text-sm text-[var(--text-primary)]">{a.name}</p>
            <p className="font-mono text-xs text-emerald-400">{a.code}</p>
          </div>
        </div>
      )}
    </div>
  );
}
