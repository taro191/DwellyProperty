"use client";

import { useState } from "react";
import { Check, CheckCircle2, Copy, MapPin, QrCode, Share2, Sparkles, X } from "lucide-react";
import { LineIcon } from "@/components/app/brand-icons";
import { SHARE_CATEGORY, num, type ListingView } from "@/lib/listing-view";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** "แชร์ข้อมูลทรัพย์ (Share Deal)" dialog (design: `_n`). */
export function ShareSheet({ property: m, onClose }: { property: ListingView; onClose: () => void }) {
  const [copied, setCopied] = useState<"summary" | "link" | null>(null);
  const [tab, setTab] = useState<"share" | "qrcode">("share");

  const price =
    m.listingType === "rent"
      ? `฿${num(m.rentPrice || m.price)} / เดือน`
      : `฿${num(m.price)}${m.listingType === "sale_or_rent" && m.rentPrice ? ` (เช่า ฿${num(m.rentPrice)}/ด)` : ""}`;
  const l = m.land;
  const size = l ? `${l.rai > 0 ? `${l.rai} ไร่ ` : ""}${l.ngan > 0 ? `${l.ngan} งาน ` : ""}${l.sqWa || 0} ตร.ว. (${num(l.totalSqWa)} ตร.ว.)` : `${m.size} ตร.ม.`;
  const kind = SHARE_CATEGORY[m.category] ?? "อสังหาริมทรัพย์";
  const url = typeof window !== "undefined" ? `${window.location.origin}/property/${m.code}` : `/property/${m.code}`;
  const summary = `🏡 [แนะนำอสังหาฯ] ${m.name}
💰 ราคา: ${price}
📍 ทำเล: ${m.location}
📐 ขนาด: ${size}
🏷️ ประเภท: ${kind}
✨ จุดเด่น: ${m.tags.length > 0 ? m.tags.slice(0, 3).join(" • ") : "ทำเลศักยภาพ เอกสารสิทธิ์ครบถ้วน"}
${l?.deedType ? `📄 เอกสารสิทธิ์: ${l.deedType}\n` : ""}${l?.zoning ? `🎨 ผังสี: ${l.zoning}\n` : ""}
🔗 ดูข้อมูล รูปภาพ และนัดชมทรัพย์ได้ที่:
${url}
#DwellyProperty #อสังหาฯไทย #ซื้อขายบ้านที่ดิน`;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(summary)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🏡 ${m.name} - ${price} ที่ ${m.location}`)}&url=${encodeURIComponent(url)}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&margin=10`;

  const copy = async (text: string, what: "summary" | "link") => {
    if (await copyText(text)) {
      setCopied(what);
      setTimeout(() => setCopied(null), 2500);
    }
  };
  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: m.name, text: summary, url });
      } catch {}
    } else copy(summary, "summary");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden max-h-[90vh] max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[var(--text-primary)]">แชร์ข้อมูลทรัพย์ (Share Deal)</h3>
              <p className="text-[10px] text-[var(--text-secondary)]">ส่งต่อให้ลูกค้า สมาชิกในครอบครัว หรือกลุ่มนายหน้า</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer" aria-label="ปิด">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex border-b border-[var(--border)] bg-[var(--surface)] text-xs font-bold px-4 pt-2">
          <button
            type="button"
            onClick={() => setTab("share")}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${tab === "share" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>ช่องทางแชร์ & สรุปดีล</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("qrcode")}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${tab === "qrcode" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code สแกนดูทรัพย์</span>
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-4">
          <div className="flex gap-3 p-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.image} alt={m.name} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[var(--border)]" />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--accent)]/15 text-[var(--accent)] font-bold">{kind}</span>
              <h4 className="font-extrabold text-xs text-[var(--text-primary)] truncate mt-1">{m.name}</h4>
              <p className="text-[10px] text-[var(--text-secondary)] truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                {m.location}
              </p>
              <p className="text-xs font-black text-amber-400 mt-1 tabular-nums">{price}</p>
            </div>
          </div>
          {tab === "share" ? (
            <>
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center justify-between">
                  <span>แชร์ด่วนผ่าน LINE ทันที (One-Tap LINE Share)</span>
                  <span className="text-[10px] text-emerald-400 font-extrabold">ยอดนิยม ★</span>
                </p>
                <a
                  href={lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#06C755]/25 transition-all cursor-pointer"
                >
                  <LineIcon className="w-5 h-5 fill-white" />
                  <span>แชร์เข้า LINE ทันที (เลือกเพื่อนหรือกลุ่ม)</span>
                </a>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[var(--text-secondary)] mb-2">แชร์ผ่านช่องทางโซเชียลอื่นๆ</p>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={fbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-[var(--surface-2)] hover:bg-[#1877F2]/15 text-[var(--text-primary)] hover:text-[#1877F2] border border-[var(--border)] hover:border-[#1877F2]/40 text-center transition-all flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#1877F2] text-white flex items-center justify-center font-black text-sm">f</div>
                    <span className="text-[11px] font-bold">Facebook</span>
                  </a>
                  <a
                    href={xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-[var(--surface-2)] hover:bg-white/10 text-[var(--text-primary)] border border-[var(--border)] text-center transition-all flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-black text-xs border border-white/20">𝕏</div>
                    <span className="text-[11px] font-bold">X (Twitter)</span>
                  </a>
                  <button
                    type="button"
                    onClick={nativeShare}
                    className="p-2.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--accent)]/15 text-[var(--text-primary)] hover:text-[var(--accent)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-center transition-all flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-black flex items-center justify-center font-black">
                      <Share2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold">แชร์ของมือถือ</span>
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>ข้อความสรุปดีล (พร้อมแคปชั่นโพสต์ / ส่งกลุ่ม)</span>
                  </span>
                  <button type="button" onClick={() => copy(summary, "summary")} className="text-[10px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer">
                    {copied === "summary" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>คัดลอกข้อความ</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={summary}
                  rows={4}
                  className="w-full p-2.5 text-[11px] leading-relaxed rounded-xl bg-black/40 border border-[var(--border)] text-[var(--text-secondary)] font-mono resize-none focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => copy(summary, "summary")}
                  className="w-full py-2 px-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 text-[var(--text-primary)] hover:text-white border border-[var(--border)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {copied === "summary" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">คัดลอกข้อความสรุปดีลสำเร็จ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>คัดลอกข้อความสรุปดีลทั้งหมด</span>
                    </>
                  )}
                </button>
              </div>
              <div className="space-y-1 pt-1 border-t border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">ลิงก์ตรงของทรัพย์นี้ (Direct Link)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={url}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] select-all outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => copy(url, "link")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${copied === "link" ? "bg-emerald-500 text-white font-black" : "bg-[var(--accent)] text-[var(--bg)] hover:brightness-110"}`}
                  >
                    {copied === "link" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-4 text-center space-y-4">
              <div className="inline-block p-4 rounded-3xl bg-white shadow-xl border-4 border-amber-400/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Property QR Code" className="w-48 h-48 mx-auto" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[var(--text-primary)]">สแกนเพื่อเปิดดูทรัพย์นี้บนมือถือ</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
                  ยื่นหน้าจอให้ลูกค้าหรือผู้ร่วมงานเปิดกล้องมือถือสแกน เพื่อเปิดดูข้อมูล รายละเอียด และรูปภาพได้ทันที
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => copy(url, "link")}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 text-[var(--text-primary)] border border-[var(--border)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>คัดลอกลิงก์ของ QR Code นี้</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
