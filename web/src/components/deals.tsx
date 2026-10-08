"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheckBig, MapPin, MessageSquare, Phone, Video } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { APPOINTMENT_STATUS_LABEL, INQUIRY_STATUS_LABEL, INTENT_LABEL, OFFER_STATUS_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime, formatTHB, timeAgo } from "@/lib/format";
import type { Appointment, Inquiry, InquiryStatus, Offer } from "@/lib/types";
import { respondOffer, updateAppointment, updateLead } from "@/app/(site)/deals-actions";

type Party = { display_name: string } | null;
type Prop = { title: string; code: string } | null;

const card = "p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm";
const input = "w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--accent)]";
const btnMain = "flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center gap-1 shadow-sm disabled:opacity-60";
const btnSuccess = "flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--success)] text-[var(--bg)] flex items-center justify-center gap-1 shadow-sm disabled:opacity-60";
const btnLine = "flex-1 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:text-white disabled:opacity-60";
const btnDanger = "py-2 px-3 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 disabled:opacity-60";
const pill = (tone: "accent" | "warning" | "success" | "purple" | "muted" | "danger") =>
  `text-[10px] px-2 py-0.5 rounded-full font-bold ${
    {
      accent: "bg-[var(--accent)]/15 text-[var(--accent)]",
      warning: "bg-[var(--warning)]/15 text-[var(--warning)]",
      success: "bg-[var(--success)]/15 text-[var(--success)]",
      purple: "bg-purple-500/15 text-purple-400",
      muted: "bg-[var(--surface-2)] text-[var(--text-secondary)]",
      danger: "bg-rose-500/15 text-rose-400",
    }[tone]
  }`;

/** Lead status colours (design: `T1`). */
const LEAD_TONE: Record<InquiryStatus, Parameters<typeof pill>[0]> = { new: "accent", contacted: "warning", qualified: "success", won: "purple", lost: "muted" };

/** A buyer's inquiry on the seller side (design: Wx "Leads ผู้สนใจ"). */
export function LeadCard({ l }: { l: Inquiry & { properties: Prop; party: Party } }) {
  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm text-[var(--text-primary)]">{l.party?.display_name}</h4>
            <span className={pill(LEAD_TONE[l.status])}>{INQUIRY_STATUS_LABEL[l.status]}</span>
          </div>
          <Link href={`/property/${l.properties?.code}`} className="block text-xs text-[var(--accent)] font-medium mt-1 truncate">
            {l.properties?.title}
          </Link>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            ความต้องการ: {INTENT_LABEL[l.intent]}
            {l.budget ? ` • งบ ${formatTHB(l.budget)}` : ""}
          </p>
          {l.message && <p className="text-xs text-[var(--text-primary)] mt-1.5 whitespace-pre-line">{l.message}</p>}
          <p className="text-[10px] text-[var(--text-secondary)] mt-1.5">
            {timeAgo(l.created_at)}
            {l.contact_phone && (
              <>
                {" • "}
                <a href={`tel:${l.contact_phone}`} className="text-emerald-400 font-bold">
                  📞 {l.contact_phone}
                </a>
              </>
            )}
          </p>
        </div>
      </div>
      <ActionForm action={updateLead} className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
        <input type="hidden" name="id" value={l.id} />
        <div className="flex gap-2">
          <select name="status" defaultValue={l.status} aria-label="สถานะ" className={`${input} font-bold`}>
            {(Object.keys(INQUIRY_STATUS_LABEL) as InquiryStatus[]).map((s) => (
              <option key={s} value={s}>
                {INQUIRY_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <SubmitButton plain className="px-4 rounded-xl text-xs font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] shrink-0">
            บันทึก
          </SubmitButton>
        </div>
        <textarea name="seller_notes" defaultValue={l.seller_notes ?? ""} rows={2} placeholder="บันทึกส่วนตัว (ผู้ซื้อไม่เห็น)" className={`${input} resize-none`} />
      </ActionForm>
    </div>
  );
}

const APPT_TONE: Record<string, Parameters<typeof pill>[0]> = { pending: "warning", confirmed: "success", completed: "accent", declined: "danger", cancelled: "muted", no_show: "danger" };

export function AppointmentCard({ a, side, property, other }: { a: Appointment; side: "seller" | "buyer"; property: Prop; other: Party }) {
  const upcoming = new Date(a.scheduled_at) > new Date();
  const Icon = a.format === "video" ? Video : a.format === "phone" ? Phone : MapPin;
  return (
    <div className={`${card} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-extrabold text-sm text-[var(--accent)]">
            <Icon className="w-4 h-4" />
            {formatDateTime(a.scheduled_at)}
          </p>
          <Link href={`/property/${property?.code}`} className="block font-bold text-xs text-[var(--text-primary)] mt-1 truncate hover:text-[var(--accent)]">
            {property?.title}
          </Link>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {side === "seller" ? "ผู้ขอนัด" : "ผู้พาชม"}: {other?.display_name} • {a.format === "onsite" ? "🏢 ชมห้องจริง" : a.format === "video" ? "📹 วิดีโอคอล" : "📞 โทรปรึกษา"}
          </p>
        </div>
        <span className={pill(APPT_TONE[a.status] ?? "muted")}>{APPOINTMENT_STATUS_LABEL[a.status]}</span>
      </div>
      {a.buyer_note && <p className="text-xs text-[var(--text-secondary)] bg-[var(--surface-2)] p-2 rounded-xl">💬 {a.buyer_note}</p>}
      {a.seller_note && <p className="text-xs text-[var(--text-secondary)]">📝 ผู้ขาย: {a.seller_note}</p>}
      {a.meeting_url && a.status === "confirmed" && (
        <a href={a.meeting_url} target="_blank" rel="noreferrer" className="block text-xs font-bold text-[var(--accent)] underline">
          เข้าร่วมวิดีโอคอล
        </a>
      )}
      {side === "seller" && a.status === "pending" && (
        <ActionForm action={updateAppointment} className="pt-3 border-t border-[var(--border)] space-y-2">
          <input type="hidden" name="id" value={a.id} />
          {a.format === "video" && <input name="meeting_url" type="url" placeholder="ลิงก์ Google Meet / Zoom / LINE (ไม่บังคับ)" className={input} />}
          <FieldError name="meeting_url" />
          <input name="seller_note" placeholder="ข้อความถึงผู้ขอนัด เช่น จุดนัดพบ" className={input} />
          <div className="flex gap-2">
            <SubmitButton plain name="status" value="confirmed" className={btnSuccess}>
              <CircleCheckBig className="w-4 h-4" /> ยืนยันนัด
            </SubmitButton>
            <SubmitButton plain name="status" value="declined" className={btnLine}>
              ปฏิเสธ
            </SubmitButton>
          </div>
        </ActionForm>
      )}
      {side === "seller" && a.status === "confirmed" && !upcoming && (
        <ActionForm action={updateAppointment} className="pt-3 border-t border-[var(--border)] flex gap-2">
          <input type="hidden" name="id" value={a.id} />
          <SubmitButton plain name="status" value="completed" className={btnMain}>
            ชมเสร็จแล้ว
          </SubmitButton>
          <SubmitButton plain name="status" value="no_show" className={btnLine}>
            ไม่มาตามนัด
          </SubmitButton>
        </ActionForm>
      )}
      {(a.status === "pending" || (a.status === "confirmed" && upcoming)) && (
        <ActionForm action={updateAppointment}>
          <input type="hidden" name="id" value={a.id} />
          <SubmitButton plain name="status" value="cancelled" className={btnDanger}>
            ยกเลิกนัด
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

const OFFER_TONE: Record<string, Parameters<typeof pill>[0]> = { pending: "warning", countered: "purple", accepted: "success", rejected: "danger", withdrawn: "muted", expired: "muted" };

/** Offer card (design: Wx "การต่อรองราคา"). */
export function OfferCard({ o, side, property, other }: { o: Offer; side: "seller" | "buyer"; property: Prop; other: Party }) {
  const [countering, setCountering] = useState(false);
  const listed = Number(o.listed_price);
  const diff = listed - Number(o.offer_price);
  const pct = listed ? ((diff / listed) * 100).toFixed(1) : "0";
  const live = (o.status === "pending" || o.status === "countered") && new Date(o.valid_until) > new Date();

  return (
    <div className={`${card} space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--warning)]">
            {o.status === "pending" ? "ข้อเสนอรอพิจารณา (Pending Offer)" : `ข้อเสนอ${o.kind === "rent" ? "ค่าเช่า" : "ซื้อ"}`}
          </span>
          <h4 className="font-bold text-sm text-[var(--text-primary)] mt-0.5">{other?.display_name}</h4>
          <Link href={`/property/${property?.code}`} className="block text-xs text-[var(--text-secondary)] truncate hover:text-[var(--accent)]">
            {property?.title} (ราคาประกาศ {formatTHB(listed)})
          </Link>
        </div>
        <span className={pill(OFFER_TONE[o.status] ?? "muted")}>{OFFER_STATUS_LABEL[o.status]}</span>
      </div>
      <div className="p-3 rounded-xl bg-[var(--surface-2)]">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">ราคาที่ผู้ซื้อเสนอ</p>
        <p className="font-black text-2xl text-[var(--accent)] mt-0.5">
          {formatTHB(o.offer_price)}
          {o.kind === "rent" && <span className="text-xs text-[var(--text-secondary)]">/เดือน</span>}
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          ส่วนต่าง: {diff >= 0 ? `-${formatTHB(diff)} (-${pct}%)` : `+${formatTHB(-diff)}`} • ยืนราคาถึง {formatDate(o.valid_until)}
        </p>
        {o.counter_price && (
          <p className="text-xs mt-1">
            ราคาที่ผู้ขายเสนอกลับ: <b className="text-sky-300">{formatTHB(o.counter_price)}</b>
          </p>
        )}
      </div>
      {o.buyer_note && <p className="text-xs text-[var(--text-secondary)]">💬 {o.buyer_note}</p>}
      {o.seller_note && <p className="text-xs text-[var(--text-secondary)]">📝 ผู้ขาย: {o.seller_note}</p>}
      {o.status === "accepted" && (
        <div className="p-3 rounded-xl bg-[var(--success)]/15 border border-[var(--success)]/30 text-center">
          <p className="text-xs font-bold text-[var(--success)] flex items-center justify-center gap-1.5">
            <CircleCheckBig className="w-4 h-4" />
            ตกลงราคากันแล้ว ขั้นต่อไป: นัดทำสัญญาและวางเงินมัดจำกับคู่สัญญาโดยตรง
          </p>
        </div>
      )}
      {live && side === "seller" && o.status === "pending" && (
        <ActionForm action={respondOffer} className="space-y-2">
          <input type="hidden" name="id" value={o.id} />
          {countering && (
            <>
              <input name="counter_price" type="number" min={1} required placeholder="ราคาที่ต้องการเสนอกลับ" className={input} />
              <FieldError name="counter_price" />
            </>
          )}
          <textarea name="seller_note" rows={2} placeholder="ข้อความถึงผู้เสนอ (ไม่บังคับ)" className={`${input} resize-none`} />
          {countering ? (
            <div className="flex gap-2">
              <SubmitButton plain name="status" value="countered" className={btnMain}>
                ส่งราคาเสนอกลับ
              </SubmitButton>
              <button type="button" onClick={() => setCountering(false)} className={btnLine}>
                ยกเลิก
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <SubmitButton plain name="status" value="accepted" className={btnSuccess}>
                <CircleCheckBig className="w-4 h-4" /> ยอมรับข้อเสนอ
              </SubmitButton>
              <button type="button" onClick={() => setCountering(true)} className={btnLine}>
                ต่อรองราคา
              </button>
              <SubmitButton plain name="status" value="rejected" className={btnDanger}>
                ปฏิเสธ
              </SubmitButton>
            </div>
          )}
        </ActionForm>
      )}
      {live && side === "buyer" && (
        <ActionForm action={respondOffer} className="flex gap-2">
          <input type="hidden" name="id" value={o.id} />
          {o.status === "countered" && (
            <>
              <SubmitButton plain name="status" value="accepted" className={btnSuccess}>
                ยอมรับ {formatTHB(o.counter_price)}
              </SubmitButton>
              <SubmitButton plain name="status" value="rejected" className={btnLine}>
                ไม่รับ
              </SubmitButton>
            </>
          )}
          <SubmitButton plain name="status" value="withdrawn" className={btnDanger}>
            ถอนข้อเสนอ
          </SubmitButton>
        </ActionForm>
      )}
      {side === "seller" && (
        <Link href="/messages" className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:underline">
          <MessageSquare className="w-3.5 h-3.5" /> ต่อรองในแชท
        </Link>
      )}
    </div>
  );
}
