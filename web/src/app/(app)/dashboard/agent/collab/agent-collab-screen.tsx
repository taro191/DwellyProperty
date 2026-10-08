"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock4, Key, MessageSquare, Phone, Plus, Send, ShieldAlert, Tag } from "lucide-react";
import { logActivity } from "@/app/(app)/dashboard/collab/actions";

type Deal = "sale" | "rent";
export type AgentJob = {
  id: string; propertyId: string; code: string; name: string; type: string; location: string; price: string; deal: Deal;
  contract: "open_multi" | "exclusive"; commission: string; ownerName: string; ownerAvatar: string | null; ownerPhone: string | null; ownerLine: string | null;
  notice: string | null; viewings: number; locks: number;
  logs: { id: string; kind: string; client: string | null; phone4: string | null; notes: string; when: string; date: string }[];
};

const REPORT = [
  { key: "viewing", label: "👁️ พาชมห้องจริง", desc: "บันทึกวันเวลาและผลการพาชม" },
  { key: "lead_lock", label: "🔒 ล็อกสิทธิ์ลูกค้า", desc: "คุ้มครองสิทธิ์นายหน้า 14 วัน" },
  { key: "customer_feedback", label: "💬 ฟีดแบ็กลูกค้า", desc: "ความเห็น ข้อเสนอแนะ" },
  { key: "offer_submitted", label: "📝 ยื่นเสนอจอง/มัดจำ", desc: "แจ้งข้อเสนอราคาและเงื่อนไข" },
];

/** Agency-Owner Collab (design: `Jx`, screen "agency-owner-collab"). */
export function AgentCollabScreen({ jobs, isAgent }: { jobs: AgentJob[]; isAgent: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | Deal>("all");
  const [selected, setSelected] = useState(jobs[0]?.id ?? "");
  const [reporting, setReporting] = useState(false);
  const [kind, setKind] = useState("viewing");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isAgent) {
    return (
      <div className="min-h-dvh pb-24 bg-[var(--bg)] flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[var(--surface)] border border-purple-500/40 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-lg text-[var(--text-primary)]">สงวนสิทธิ์เฉพาะ &quot;นายหน้า (Agency / Agent)&quot;</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">สร้างโปรไฟล์นายหน้าก่อน แล้วเจ้าของทรัพย์จะแต่งตั้งคุณให้ดูแลงานขาย/เช่าได้</p>
            </div>
            <Link href="/dashboard/agent" className="block w-full py-2.5 rounded-xl font-bold text-xs bg-[var(--accent)] text-[var(--bg)] shadow-md">
              ไปที่ Agency Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const shown = jobs.filter((j) => filter === "all" || j.deal === filter);
  const job = jobs.find((j) => j.id === selected) ?? shown[0];
  const submit = (fd: FormData) =>
    startTransition(async () => {
      setError(null);
      const r = await logActivity(fd);
      if (r.ok) {
        setReporting(false);
        router.refresh();
      } else setError(r.fieldErrors ? (Object.values(r.fieldErrors).flat()[0] ?? r.error) : r.error);
    });
  const field = "w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:border-purple-400 outline-none";

  return (
    <div className="min-h-dvh pb-24 bg-[var(--bg)]">
      <div className="mx-4 mt-4 p-4 rounded-3xl bg-gradient-to-br from-[#1a0e2e] via-[var(--surface)] to-[#110a1f] border border-purple-500/30 shadow-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">🤝 2-WAY SYNC SYSTEM</span>
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ซิงก์ตรงกับ Owner Dashboard
          </span>
        </div>
        <h2 className="text-base font-black text-[var(--text-primary)] mt-1.5">ศูนย์เชื่อมโยงเจ้าของทรัพย์ (Owner Co-Work)</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">รายงานการพาชมห้อง ล็อกสิทธิ์ลูกค้า (Lead Lock) และรับเงื่อนไขราคาล่าสุดจากเจ้าของทันที ไม่ต้องตามแชทหลายที่</p>
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[var(--border)] text-center">
          <div className="p-2 rounded-xl bg-purple-900/20 border border-purple-500/20">
            <p className="font-black text-lg text-purple-300">{jobs.length}</p>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">ทรัพย์ที่ได้รับมอบหมาย</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-900/20 border border-emerald-500/20">
            <p className="font-black text-lg text-emerald-400">{jobs.reduce((n, j) => n + j.viewings, 0)}</p>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">พาชมห้องสะสม</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-900/20 border border-amber-500/20">
            <p className="font-black text-lg text-amber-400">{jobs.reduce((n, j) => n + j.locks, 0)}</p>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">ลูกค้าที่ล็อกสิทธิ์ไว้</p>
          </div>
        </div>
      </div>
      {jobs.length === 0 ? (
        <div className="mx-4 mt-4 p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-2">
          <p className="font-bold text-sm text-[var(--text-primary)]">ยังไม่มีทรัพย์ที่ได้รับมอบหมาย</p>
          <p className="text-xs text-[var(--text-secondary)]">เมื่อเจ้าของทรัพย์แต่งตั้งคุณใน Owner-Agent Hub งานจะแสดงที่นี่ทันที</p>
        </div>
      ) : (
        <>
          <div className="px-4 mt-4">
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${filter === "all" ? "bg-purple-600 text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-white"}`}
              >
                ทั้งหมด ({jobs.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("sale")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${filter === "sale" ? "bg-amber-500 text-black shadow-sm" : "text-[var(--text-secondary)] hover:text-white"}`}
              >
                <Tag className="w-3.5 h-3.5" />
                งานขาย ({jobs.filter((j) => j.deal === "sale").length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("rent")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${filter === "rent" ? "bg-sky-500 text-black shadow-sm" : "text-[var(--text-secondary)] hover:text-white"}`}
              >
                <Key className="w-3.5 h-3.5" />
                งานเช่า ({jobs.filter((j) => j.deal === "rent").length})
              </button>
            </div>
          </div>
          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-[var(--text-secondary)]">เลือกทรัพย์ที่กำลังดำเนินการ</span>
              <span className="text-[11px] text-purple-400 font-bold">{shown.length} รายการ</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {shown.map((j) => (
                <button
                  type="button"
                  onClick={() => setSelected(j.id)}
                  className={`shrink-0 w-64 p-3 rounded-2xl text-left border transition-all cursor-pointer ${j.id === job?.id ? "bg-gradient-to-br from-[#22133a] to-[var(--surface)] border-purple-500 shadow-md ring-1 ring-purple-500" : "bg-[var(--surface)] border-[var(--border)] hover:border-purple-500/50"}`}
                  key={j.id}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${j.deal === "sale" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-sky-500/20 text-sky-400 border border-sky-500/30"}`}
                    >
                      {j.deal === "sale" ? "🏷️ งานขาย" : "🔑 งานเช่า"}
                    </span>
                    <span className="text-[9px] font-bold text-[var(--text-secondary)]">{j.contract === "exclusive" ? "⭐ Exclusive" : "🌐 Open Co-Agent"}</span>
                  </div>
                  <h4 className="font-extrabold text-xs text-[var(--text-primary)] truncate">{j.name}</h4>
                  <p className="text-[11px] font-black text-purple-400 mt-0.5">{j.price}</p>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-2 pt-2 border-t border-[var(--border)]">
                    <span>พาชม {j.viewings} ครั้ง</span>
                    <span className="text-amber-400 font-bold">ล็อก {j.locks} คน</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {job && (
            <>
              <div className="mx-4 mt-4 p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${job.deal === "sale" ? "bg-amber-500/20 text-amber-300" : "bg-sky-500/20 text-sky-300"}`}>
                        {job.deal === "sale" ? "งานขาย (Sale Deal)" : "งานเช่า (Rental Deal)"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)]">
                        สัญญา: {job.contract === "exclusive" ? "Exclusive ติดสัญญาเดี่ยว" : "Open Multi-Agent แข่งขันอิสระ"}
                      </span>
                    </div>
                    <h3 className="font-black text-sm text-[var(--text-primary)] mt-1.5">{job.name}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {job.type} • {job.location}
                    </p>
                    <p className="text-xs font-black text-purple-400 mt-1">
                      เรตคอมมิชชั่นของคุณ: <span className="underline decoration-purple-400">{job.commission}</span>
                    </p>
                  </div>
                  <Link
                    href={`/property/${job.code}`}
                    className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--border)] text-[11px] font-bold text-[var(--text-secondary)] hover:text-white shrink-0 transition-colors"
                  >
                    ดูหน้าทรัพย์ ↗
                  </Link>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-r from-[#171b26] to-[var(--surface-2)] border border-sky-500/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {job.ownerAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={job.ownerAvatar} alt="Owner" className="w-10 h-10 rounded-xl object-cover border border-sky-400/30 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl border border-sky-400/30 bg-[var(--surface-2)] shrink-0 flex items-center justify-center font-black text-sky-300">{job.ownerName.charAt(0)}</div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-[var(--text-primary)] truncate">{job.ownerName}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">เจ้าของทรัพย์</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        โทร: {job.ownerPhone ?? "-"} • LINE: {job.ownerLine ?? "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {job.ownerPhone && (
                      <a href={`tel:${job.ownerPhone}`} className="p-2 rounded-xl bg-emerald-500 text-black hover:brightness-110 font-bold transition-all shadow" title="โทรติดต่อเจ้าของ">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <Link href="/messages" className="p-2 rounded-xl bg-sky-500 text-black hover:brightness-110 font-bold transition-all shadow" title="ส่งข้อความแชท">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
                {job.notice && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0">📌</span>
                      <div>
                        <p className="font-bold text-xs text-amber-300">อัปเดตราคา & เงื่อนไขล่าสุดจากเจ้าของห้อง (Broadcast)</p>
                        <p className="text-xs mt-0.5 leading-relaxed text-amber-100/90 whitespace-pre-line">{job.notice}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setReporting(true);
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-xs hover:brightness-110 shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>รายงานการพาชมห้อง / ขอล็อกสิทธิ์ลูกค้า (Lead Lock)</span>
                  </button>
                  <p className="text-[10px] text-center text-[var(--text-secondary)] mt-1.5">*เมื่อส่งข้อมูล ระบบจะแจ้งเตือนและบันทึกลงใน Owner-Agent Hub ของเจ้าของทรัพย์ทันที</p>
                </div>
              </div>
              <div className="mx-4 mt-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock4 className="w-4 h-4 text-purple-400" />
                    <h3 className="font-black text-sm text-[var(--text-primary)]">ประวัติการดำเนินงานที่คุณส่งให้เจ้าของ (Activity Log)</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 shrink-0">{job.logs.length} รายการ</span>
                </div>
                {job.logs.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-center text-[var(--text-secondary)]">
                    <p className="text-xs">ยังไม่มีประวัติการส่งข้อมูลสำหรับทรัพย์นี้</p>
                    <button type="button" onClick={() => setReporting(true)} className="mt-2 text-xs font-bold text-purple-400 hover:underline">
                      + บันทึกการพาชมห้องครั้งแรก
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {job.logs.map((l) => {
                      const v = l.kind === "viewing";
                      const lock = l.kind === "lead_lock";
                      const offer = l.kind === "offer_submitted";
                      return (
                        <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs" key={l.id}>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full ${v ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : lock ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : offer ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-sky-500/20 text-sky-400 border border-sky-500/30"}`}
                              >
                                {v ? "👁️ พาชมห้องจริง" : lock ? "🔒 คุ้มครองสิทธิ์ (Lead Locked)" : offer ? "📝 ยื่นข้อเสนอราคา" : "💬 ฟีดแบ็กลูกค้า"}
                              </span>
                              {l.client && <span className="font-extrabold text-xs text-[var(--text-primary)]">{l.client}</span>}
                              {l.phone4 && <span className="text-[10px] text-[var(--text-secondary)]">(xxx-{l.phone4})</span>}
                            </div>
                            <span className="text-[10px] text-[var(--text-secondary)] shrink-0">{l.when}</span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] pl-2 border-l-2 border-purple-500/30 py-0.5 leading-relaxed whitespace-pre-line">{l.notes}</p>
                          <div className="mt-2.5 flex items-center justify-between text-[10px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
                            <span className="flex items-center gap-1 text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              ส่งแจ้งเจ้าของเรียบร้อย
                            </span>
                            <span>{l.date}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
      {reporting && job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-purple-500/50 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="min-w-0">
                <h3 className="font-black text-sm text-[var(--text-primary)]">รายงานผลการดำเนินงานให้เจ้าของทรัพย์</h3>
                <p className="text-[11px] text-purple-400 truncate max-w-xs mt-0.5">{job.name}</p>
              </div>
              <button type="button" onClick={() => setReporting(false)} className="w-8 h-8 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] flex items-center justify-center hover:text-white" aria-label="ปิด">
                ✕
              </button>
            </div>
            <form action={submit} className="space-y-3.5">
              <input type="hidden" name="property_id" value={job.propertyId} />
              <input type="hidden" name="deal" value={job.deal} />
              <input type="hidden" name="kind" value={kind} />
              <div>
                <span className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">ประเภทการรายงาน</span>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT.map((o) => (
                    <button
                      type="button"
                      onClick={() => setKind(o.key)}
                      className={`p-2.5 rounded-xl text-left border text-xs transition-all ${kind === o.key ? "bg-purple-600/20 border-purple-400 text-purple-200" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]"}`}
                      key={o.key}
                    >
                      <p className="font-extrabold">{o.label}</p>
                      <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ชื่อลูกค้า / ผู้สนใจ</span>
                <input name="client_name" type="text" maxLength={80} required={kind === "lead_lock"} placeholder="เช่น คุณธนพล (นักธุรกิจ)" className={field} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-[var(--text-secondary)] mb-1">เบอร์โทรลูกค้า 4 ตัวท้าย (สำหรับ Lead Lock)</span>
                <input name="client_phone_last4" inputMode="numeric" pattern="\d{4}" maxLength={4} required={kind === "lead_lock"} placeholder="เช่น 5678" className={field} />
                <span className="block text-[9px] text-[var(--text-secondary)] mt-1">*ระบบเก็บเฉพาะ 4 ตัวท้ายเพื่อคุ้มครองข้อมูลลูกค้า</span>
              </label>
              {kind === "offer_submitted" && (
                <label className="block">
                  <span className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ราคาที่ลูกค้าเสนอ (บาท)</span>
                  <input name="amount" type="number" inputMode="numeric" min={1} className={field} />
                </label>
              )}
              {kind !== "lead_lock" && (
                <label className="block">
                  <span className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ระดับความสนใจของลูกค้า</span>
                  <select name="interest" defaultValue="" className={field}>
                    <option value="">ไม่ระบุ</option>
                    <option value="ready_to_book">🔥 พร้อมทำสัญญาทันที</option>
                    <option value="interested_high">⭐ สนใจมาก</option>
                    <option value="considering">⏳ อยู่ระหว่างพิจารณา</option>
                  </select>
                </label>
              )}
              <label className="block">
                <span className="block text-xs font-bold text-[var(--text-secondary)] mb-1">รายละเอียดการพาชม / ความสนใจ / ข้อเสนอแนะ</span>
                <textarea
                  name="summary"
                  rows={3}
                  required
                  minLength={3}
                  maxLength={2000}
                  placeholder="เช่น ลูกค้าชอบวิวสระว่ายน้ำมาก ขอปรึกษาครอบครัวเรื่องวางเงินมัดจำภายในวันอาทิตย์นี้..."
                  className={`${field} resize-none`}
                />
              </label>
              {error && <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">{error}</p>}
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setReporting(false)} className="flex-1 py-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] font-bold text-xs hover:text-white">
                  ยกเลิก
                </button>
                <button type="submit" disabled={pending} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-extrabold text-xs hover:brightness-110 shadow-md flex items-center justify-center gap-1.5 disabled:opacity-60">
                  <Send className="w-3.5 h-3.5" />
                  <span>{pending ? "กำลังส่ง…" : "ส่งรายงานให้เจ้าของ"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
