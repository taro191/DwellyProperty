"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, ChevronRight, Clock4, FileCheck, Key, MessageSquare, Phone, Plus, Send, ShieldCheck, Sparkles, Tag, UserCheck, Users, X } from "lucide-react";
import { num } from "@/lib/listing-view";
import { assignAgent, endAgent, postNotice } from "./actions";

type Deal = "sale" | "rent";
export type HubProperty = { id: string; code: string; name: string; location: string; price: number; isLand: boolean; verified: boolean; deals: Deal[] };
export type HubAgent = {
  id: string; agentId: string; deal: Deal; name: string; avatar: string | null; phone: string | null; code: string | null; company: string | null;
  contract: "open_multi" | "exclusive"; commission: string; viewings: number; locks: number; lastNote: string | null; lastWhen: string | null;
};
export type HubLog = {
  id: string; deal: Deal; kind: string; author: string; avatar: string | null; when: string; client: string | null; amount: number | null; interest: string | null; summary: string;
};
export type DirectoryAgent = { id: string; name: string; code: string; company: string | null; closed: number };

const KIND: Record<string, { label: string; cls: string }> = {
  viewing: { label: "👁️ พาชมห้องจริง", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  offer_submitted: { label: "📝 ยื่นข้อเสนอจอง", cls: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  lead_lock: { label: "🔒 ล็อกสิทธิ์ลูกค้า", cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  customer_feedback: { label: "💬 ฟีดแบ็กลูกค้า", cls: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  owner_notice: { label: "📢 ประกาศราคา", cls: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  marketing: { label: "🚀 การตลาด", cls: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
};
const INTEREST: Record<string, { label: string; cls: string }> = {
  ready_to_book: { label: "🔥 พร้อมทำสัญญาทันที", cls: "text-emerald-400" },
  interested_high: { label: "⭐ สนใจมาก", cls: "text-sky-400" },
  considering: { label: "⏳ อยู่ระหว่างพิจารณา", cls: "text-amber-400" },
};

/** Owner-Agent Hub (design: `Zx`, screen "owner-agent-collab"). */
export function CollabScreen({
  properties, current, agents, logs, directory,
}: { properties: HubProperty[]; current: HubProperty; agents: HubAgent[]; logs: HubLog[]; directory: DirectoryAgent[] }) {
  const router = useRouter();
  const [deal, setDeal] = useState<Deal>(current.deals[0]);
  const [tab, setTab] = useState<"agents" | "activity" | "policy">("agents");
  const [assigning, setAssigning] = useState(false);
  const [noticing, setNoticing] = useState(false);
  const [formDeal, setFormDeal] = useState<Deal>(deal);
  const [commission, setCommission] = useState(deal === "rent" ? "ค่าเช่า 1 เดือน (สัญญา 1 ปี)" : "3.0%");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mine = agents.filter((a) => a.deal === deal);
  const feed = logs.filter((l) => l.deal === deal);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[]> }>, then: () => void) =>
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) {
        setDone(r.message ?? "สำเร็จ");
        router.refresh();
        setTimeout(() => {
          setDone(null);
          then();
        }, 1500);
      } else setError(r.fieldErrors ? (Object.values(r.fieldErrors).flat()[0] ?? r.error ?? "") : (r.error ?? ""));
    });
  const openAssign = () => {
    setFormDeal(deal);
    setCommission(deal === "rent" ? "ค่าเช่า 1 เดือน (สัญญา 1 ปี)" : "3.0%");
    setError(null);
    setAssigning(true);
  };
  const tabBtn = (on: boolean) =>
    `px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${on ? "bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/40 shadow-sm" : "text-[var(--text-secondary)] hover:text-white"}`;

  return (
    <div className="min-h-dvh pb-28 bg-[var(--bg)]">
      <div className="px-4 pt-3 pb-2">
        <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <Building2 className="w-5 h-5 text-[var(--accent)] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] block">เลือกทรัพย์สินที่ต้องการบริหาร:</span>
              <select
                value={current.id}
                onChange={(e) => router.push(`/dashboard/collab?p=${e.target.value}`)}
                aria-label="เลือกทรัพย์"
                className="font-extrabold text-xs text-[var(--text-primary)] bg-transparent focus:outline-none cursor-pointer truncate max-w-[210px]"
              >
                {properties.map((p) => (
                  <option value={p.id} className="bg-[var(--surface-2)]" key={p.id}>
                    {p.name} (฿{num(p.price)})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Link
            href={`/property/${current.code}`}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 transition-colors shrink-0 flex items-center gap-1"
          >
            <span>ดูหน้าทรัพย์</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
      <div className="mx-4 mt-2 p-4 rounded-3xl bg-gradient-to-br from-[#0c1813] via-[var(--surface)] to-[#131f18] border border-[var(--accent)]/30 shadow-lg relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--bg)] uppercase">{current.isLand ? "แปลงที่ดิน" : "คอนโด/ที่อยู่อาศัย"}</span>
              {current.verified && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> โฉนดตรวจสอบแล้ว
                </span>
              )}
            </div>
            <h1 className="font-extrabold text-base text-[var(--text-primary)] mt-1 truncate">{current.name}</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{current.location}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-[var(--text-secondary)] block">ราคากลางที่ตั้งไว้</span>
            <span className="text-base font-black text-[var(--accent)]">฿{num(current.price)}</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/50 border border-[var(--border)]">
            <button
              type="button"
              disabled={!current.deals.includes("sale")}
              onClick={() => setDeal("sale")}
              className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 ${deal === "sale" ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "text-[var(--text-secondary)] hover:text-white"}`}
            >
              <Tag className="w-4 h-4" />
              <span>🏷️ ประเภทงานขาย (Sale)</span>
            </button>
            <button
              type="button"
              disabled={!current.deals.includes("rent")}
              onClick={() => setDeal("rent")}
              className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 ${deal === "rent" ? "bg-sky-400 text-black shadow-md" : "text-[var(--text-secondary)] hover:text-white"}`}
            >
              <Key className="w-4 h-4" />
              <span>🔑 ประเภทงานเช่า (Rent)</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="p-2 rounded-xl bg-[var(--surface-2)]/80 border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-secondary)] block">นายหน้าที่ได้รับมอบ</span>
            <span className="font-black text-sm text-[var(--text-primary)]">{mine.length} คน</span>
          </div>
          <div className="p-2 rounded-xl bg-[var(--surface-2)]/80 border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-secondary)] block">พาชมห้องสะสม</span>
            <span className="font-black text-sm text-[var(--accent)]">{mine.reduce((n, a) => n + a.viewings, 0)} ครั้ง</span>
          </div>
          <div className="p-2 rounded-xl bg-[var(--surface-2)]/80 border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-secondary)] block">ล็อกสิทธิ์ลูกค้า (Lock)</span>
            <span className="font-black text-sm text-purple-400">{mine.reduce((n, a) => n + a.locks, 0)} ราย</span>
          </div>
        </div>
      </div>
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={openAssign}
          className="py-2.5 px-3 rounded-2xl bg-[var(--accent)] text-[var(--bg)] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ แต่งตั้งนายหน้าใหม่</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setNoticing(true);
          }}
          className="py-2.5 px-3 rounded-2xl bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>แจ้งราคากลาง/เงื่อนไข</span>
        </button>
      </div>
      <div className="mx-4 mt-4 flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto no-scrollbar">
        <button type="button" onClick={() => setTab("agents")} className={tabBtn(tab === "agents")}>
          <Users className="w-3.5 h-3.5" />
          <span>นายหน้าที่ดูแล ({mine.length})</span>
        </button>
        <button type="button" onClick={() => setTab("activity")} className={tabBtn(tab === "activity")}>
          <Clock4 className="w-3.5 h-3.5" />
          <span>อัปเดตการดำเนินงานสด ({feed.length})</span>
        </button>
        <button type="button" onClick={() => setTab("policy")} className={tabBtn(tab === "policy")}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>กติกากันชน & คอมมิชชั่น</span>
        </button>
      </div>
      {tab === "agents" && (
        <div className="mx-4 mt-3 space-y-3">
          {mine.map((a) => (
            <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-[var(--accent)]/40 transition-all" key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {a.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatar} alt={a.name} className="w-12 h-12 rounded-2xl object-cover border border-[var(--border)] shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shrink-0 flex items-center justify-center font-black text-[var(--accent)]">{a.name.charAt(0)}</div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-sm text-[var(--text-primary)] truncate">{a.name}</h3>
                      {a.code && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">{a.code}</span>}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{a.company ?? "นายหน้าอิสระ"}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${a.contract === "exclusive" ? "bg-amber-400 text-black" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"}`}
                >
                  {a.contract === "exclusive" ? "⭐ Exclusive" : "Open Multi-Agent"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 py-2 px-3 rounded-2xl bg-black/40 border border-[var(--border)] text-xs text-center">
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block">พาชมห้องแล้ว</span>
                  <span className="font-black text-sm text-[var(--text-primary)]">{a.viewings} ครั้ง</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block">ล็อกสิทธิ์ลูกค้า</span>
                  <span className="font-black text-sm text-purple-400">{a.locks} ราย</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block">อัตราค่าคอมฯ</span>
                  <span className="font-black text-xs text-[var(--accent)] truncate block">{a.commission}</span>
                </div>
              </div>
              <div className="mt-2.5 p-2.5 rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] flex items-start gap-2 text-xs">
                <Clock4 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mb-0.5">
                    <span className="font-bold text-[var(--accent)]">บันทึกล่าสุด:</span>
                    <span>{a.lastWhen ?? "-"}</span>
                  </div>
                  <p className="text-[var(--text-primary)] font-medium leading-relaxed">{a.lastNote ?? "ยังไม่มีรายงานจากนายหน้า"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[var(--border)] text-xs font-bold">
                {a.phone ? (
                  <a
                    href={`tel:${a.phone}`}
                    className="flex-1 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>โทร: {a.phone}</span>
                  </a>
                ) : (
                  <Link
                    href="/messages"
                    className="flex-1 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                    <span>แชทสอบถาม</span>
                  </Link>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => endAgent(a.id), () => {})}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                  ยกเลิกแต่งตั้ง
                </button>
              </div>
            </div>
          ))}
          {mine.length === 0 && (
            <div className="text-center py-10 px-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)]">
              <Users className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-2 opacity-50" />
              <p className="font-bold text-sm text-[var(--text-primary)]">ยังไม่มีนายหน้ารับผิดชอบ{deal === "rent" ? "งานปล่อยเช่า" : "งานขาย"}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">กดปุ่ม &quot;แต่งตั้งนายหน้าใหม่&quot; ด้านบนเพื่อเปิดให้นายหน้ามืออาชีพช่วยหาลูกค้า</p>
              <button type="button" onClick={openAssign} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)] shadow-md cursor-pointer">
                + มอบหมายนายหน้าสำหรับ{deal === "rent" ? "การเช่า" : "การขาย"}
              </button>
            </div>
          )}
        </div>
      )}
      {tab === "activity" && (
        <div className="mx-4 mt-3 space-y-3">
          <div className="p-3 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>ฟีดกิจกรรมจะอัปเดตเมื่อนายหน้าพาลูกค้าชมห้องจริง บันทึกข้อเสนอ หรือล็อกสิทธิ์ผู้สนใจ</span>
          </div>
          {feed.map((l) => {
            const k = KIND[l.kind] ?? KIND.marketing;
            return (
              <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm relative overflow-hidden" key={l.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {l.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.avatar} alt={l.author} className="w-9 h-9 rounded-xl object-cover border border-[var(--border)]" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center font-black text-[var(--accent)] text-xs">{l.author.charAt(0)}</div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs text-[var(--text-primary)] truncate">{l.author}</h4>
                      <span className="text-[10px] text-[var(--text-secondary)]">{l.when}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${k.cls}`}>{k.label}</span>
                </div>
                <div className="mt-3 p-3 rounded-2xl bg-black/40 border border-[var(--border)] text-xs">
                  {(l.client || l.amount) && (
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                      <span>
                        ผู้สนใจ: <strong className="text-[var(--text-primary)]">{l.client ?? "-"}</strong>
                      </span>
                      {l.amount ? <span className="text-[var(--accent)] font-extrabold">฿{num(l.amount)}</span> : null}
                    </div>
                  )}
                  <p className="text-[var(--text-primary)] leading-relaxed mt-1 font-medium whitespace-pre-line">{l.summary}</p>
                  {l.interest && INTEREST[l.interest] && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--border)]/60 text-[10px]">
                      <span className="text-[var(--text-secondary)]">ระดับความสนใจ:</span>
                      <span className={`font-bold ${INTEREST[l.interest].cls}`}>{INTEREST[l.interest].label}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {feed.length === 0 && <div className="text-center py-8 text-xs text-[var(--text-secondary)]">ยังไม่มีกิจกรรมบันทึกสำหรับงานนี้</div>}
        </div>
      )}
      {tab === "policy" && (
        <div className="mx-4 mt-3 space-y-3">
          <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-emerald-400 font-extrabold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>ระบบป้องกันลูกค้าชนกัน (Lead Protection System)</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              เมื่อนายหน้าบันทึกล็อกสิทธิ์ลูกค้า (Lead Lock) พร้อมชื่อและเบอร์โทรศัพท์ 4 ตัวท้าย ระบบจะจองสิทธิ์ลูกค้ารายนี้ให้นายหน้าท่านนั้นเป็นเวลา <strong>14 วัน</strong>{" "}
              นายหน้าคนอื่นจะล็อกลูกค้ารายเดียวกันไม่ได้ เพื่อป้องกันข้อพิพาทเรื่องค่าคอมมิชชั่น
            </p>
          </div>
          <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-sky-400 font-extrabold text-sm">
              <FileCheck className="w-4 h-4" />
              <span>เงื่อนไขราคากลางและการทำโฆษณา (Zero Markup Pledge)</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              นายหน้าทุกคนต้องโพสต์ขายหรือปล่อยเช่าใน <strong>ราคากลางที่เจ้าของกำหนด</strong> เท่านั้น ห้ามบวกราคาซ่อนเร้น หากมีการปรับราคา กด &quot;แจ้งราคากลาง&quot;
              เพื่อแจ้งนายหน้าทุกคนพร้อมกัน
            </p>
          </div>
          <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-amber-400 font-extrabold text-sm">
              <Key className="w-4 h-4" />
              <span>การบริหารกุญแจและการเข้าชมห้อง (Inspection Protocol)</span>
            </div>
            <div className="space-y-1.5 text-xs text-[var(--text-secondary)] mt-1">
              <p>• ฝากคีย์การ์ด/กุญแจไว้ที่นิติบุคคลโครงการ</p>
              <p>• นายหน้าต้องแจ้งนัดหมายล่วงหน้าอย่างน้อย 2 ชั่วโมง</p>
              <p>• ทุกครั้งที่พาชมเสร็จสิ้น ต้องอัปเดตฟีดแบ็กลงในแอปทันที</p>
            </div>
          </div>
        </div>
      )}
      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button type="button" onClick={() => setAssigning(false)} className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-white" aria-label="ปิด">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-base text-[var(--text-primary)]">แต่งตั้ง / เชิญนายหน้าเข้าร่วมงาน</h3>
                <p className="text-xs text-[var(--text-secondary)] truncate">ทรัพย์: {current.name}</p>
              </div>
            </div>
            {done ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-extrabold text-base text-[var(--text-primary)]">มอบหมายงานให้นายหน้าสำเร็จ!</h4>
                <p className="text-xs text-[var(--text-secondary)]">{done}</p>
              </div>
            ) : (
              <form action={(fd) => run(() => assignAgent(fd), () => setAssigning(false))} className="space-y-4 text-xs">
                <input type="hidden" name="property_id" value={current.id} />
                <input type="hidden" name="deal" value={formDeal} />
                <div>
                  <span className="font-bold text-[var(--text-primary)] block mb-1">ประเภทงานที่ต้องการมอบหมาย:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!current.deals.includes("sale")}
                      onClick={() => {
                        setFormDeal("sale");
                        setCommission("3.0%");
                      }}
                      className={`py-2 rounded-xl font-bold transition-all disabled:opacity-40 ${formDeal === "sale" ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
                    >
                      🏷️ งานขาย (Sale)
                    </button>
                    <button
                      type="button"
                      disabled={!current.deals.includes("rent")}
                      onClick={() => {
                        setFormDeal("rent");
                        setCommission("ค่าเช่า 1 เดือน (สัญญา 1 ปี)");
                      }}
                      className={`py-2 rounded-xl font-bold transition-all disabled:opacity-40 ${formDeal === "rent" ? "bg-sky-400 text-black shadow-md" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
                    >
                      🔑 งานปล่อยเช่า (Rent)
                    </button>
                  </div>
                </div>
                <label className="block">
                  <span className="font-bold text-[var(--text-primary)] block mb-1">เลือกนายหน้าเครือข่าย Dwelly Verified:</span>
                  <select
                    name="agent_id"
                    required
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)] font-semibold focus:outline-none focus:border-[var(--accent)]"
                  >
                    {directory.map((d) => (
                      <option value={d.id} key={d.id}>
                        {d.name} ({d.code}) - สถิติปิด {d.closed} ดีล
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="font-bold text-[var(--text-primary)] block mb-1">รูปแบบสัญญาการทำงาน:</span>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] cursor-pointer">
                      <input type="radio" name="contract" value="open_multi" defaultChecked />
                      <div>
                        <span className="font-bold text-[var(--text-primary)] block">Open Multi-Agent (เปิดรับนายหน้าหลายคน)</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">ใครพาผู้ซื้อ/ผู้เช่ามาจบดีลก่อน ได้รับค่าคอมมิชชั่น</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] cursor-pointer">
                      <input type="radio" name="contract" value="exclusive" />
                      <div>
                        <span className="font-bold text-[var(--text-primary)] block">Exclusive Agent (นายหน้าเดี่ยวแบบพิเศษ)</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">มอบหมายให้ดูแลคนเดียว การันตีทำการตลาดเชิงรุก</span>
                      </div>
                    </label>
                  </div>
                </div>
                <label className="block">
                  <span className="font-bold text-[var(--text-primary)] block mb-1">อัตราค่าตอบแทน / คอมมิชชั่นที่ตกลง:</span>
                  <input
                    name="commission"
                    type="text"
                    required
                    maxLength={80}
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="เช่น 3% สุทธิ หรือ ค่าเช่า 1 เดือน"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)] font-semibold focus:outline-none focus:border-[var(--accent)]"
                  />
                </label>
                {error && <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">{error}</p>}
                <button type="submit" disabled={pending || directory.length === 0} className="w-full py-3 rounded-2xl bg-[var(--accent)] text-[var(--bg)] font-extrabold text-sm shadow-md hover:brightness-110 cursor-pointer disabled:opacity-50">
                  {pending ? "กำลังบันทึก…" : "ยืนยันแต่งตั้งนายหน้า"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      {noticing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl relative">
            <button type="button" onClick={() => setNoticing(false)} className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-white" aria-label="ปิด">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[var(--text-primary)]">แจ้งราคากลาง & อัปเดตเงื่อนไข</h3>
                <p className="text-xs text-[var(--text-secondary)]">ส่งแจ้งเตือนไปยังนายหน้าทุกคนที่ดูแลงานนี้ ({mine.length} คน)</p>
              </div>
            </div>
            {done ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-extrabold text-base text-[var(--text-primary)]">ส่งข้อความแจ้งเตือนนายหน้าทุกคนแล้ว!</h4>
              </div>
            ) : (
              <form action={(fd) => run(() => postNotice(fd), () => setNoticing(false))} className="space-y-4 text-xs">
                <input type="hidden" name="property_id" value={current.id} />
                <input type="hidden" name="deal" value={deal} />
                <label className="block">
                  <span className="font-bold text-[var(--text-primary)] block mb-1">ข้อความแจ้งเตือนถึงนายหน้า:</span>
                  <textarea
                    name="summary"
                    rows={4}
                    required
                    minLength={3}
                    maxLength={2000}
                    placeholder="เช่น ปรับราคากลางเหลือ 2.3 ล้านบาท สำหรับลูกค้าที่พร้อมโอนภายในเดือนนี้ หรือ ให้เช่าพร้อมแถมที่จอดรถฟรี..."
                    className="w-full p-3 rounded-2xl bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] font-medium leading-relaxed"
                  />
                </label>
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> ซิงก์ราคากลางทันที
                  </p>
                  <p className="text-[11px] leading-relaxed">ระบบบันทึกข้อความนี้ลงในฟีดกิจกรรม เพื่อให้นายหน้าทุกคนยึดถือราคาเดียวกันแบบ Zero Markup</p>
                </div>
                {error && <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">{error}</p>}
                <button type="submit" disabled={pending} className="w-full py-3 rounded-2xl bg-[var(--accent)] text-[var(--bg)] font-extrabold text-sm shadow-md hover:brightness-110 cursor-pointer disabled:opacity-50">
                  {pending ? "กำลังส่ง…" : "ส่งแจ้งเตือนนายหน้าทันที"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
