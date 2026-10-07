"use client";

import { useState } from "react";
import Link from "next/link";
import { Video, MapPin } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { Badge, Card, Input, Textarea } from "@/components/ui";
import { APPOINTMENT_STATUS_LABEL, OFFER_STATUS_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime, formatTHB } from "@/lib/format";
import type { Appointment, Offer } from "@/lib/types";
import { respondOffer, updateAppointment } from "@/app/(site)/deals-actions";

type Party = { display_name: string } | null;
type Prop = { title: string; code: string } | null;

const apptTone = { pending: "warning", confirmed: "accent", completed: "info" } as const;

export function AppointmentCard({ a, side, property, other }: { a: Appointment; side: "seller" | "buyer"; property: Prop; other: Party }) {
  const upcoming = new Date(a.scheduled_at) > new Date();
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            {a.format === "video" ? <Video className="h-4 w-4 text-accent" /> : <MapPin className="h-4 w-4 text-accent" />}
            {formatDateTime(a.scheduled_at)}
          </p>
          <Link href={`/property/${property?.code}`} className="text-xs text-subtle hover:text-fg">{property?.title}</Link>
          <p className="text-sm text-muted">{side === "seller" ? "ผู้ขอนัด" : "ผู้ขาย"}: {other?.display_name}</p>
        </div>
        <Badge tone={apptTone[a.status as keyof typeof apptTone] ?? "neutral"}>{APPOINTMENT_STATUS_LABEL[a.status]}</Badge>
      </div>
      {a.buyer_note && <p className="mt-2 text-sm text-muted">💬 {a.buyer_note}</p>}
      {a.seller_note && <p className="mt-1 text-sm text-muted">📝 ผู้ขาย: {a.seller_note}</p>}
      {a.meeting_url && a.status === "confirmed" && (
        <a href={a.meeting_url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-accent underline">เข้าร่วมวิดีโอคอล</a>
      )}

      {side === "seller" && a.status === "pending" && (
        <ActionForm action={updateAppointment} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={a.id} />
          {a.format === "video" && <Input name="meeting_url" type="url" placeholder="ลิงก์ Google Meet / Zoom / LINE (ไม่บังคับ)" />}
          <FieldError name="meeting_url" />
          <Input name="seller_note" placeholder="ข้อความถึงผู้ขอนัด เช่น จุดนัดพบ" />
          <div className="flex gap-2">
            <SubmitButton name="status" value="confirmed" size="sm">ยืนยันนัด</SubmitButton>
            <SubmitButton name="status" value="declined" size="sm" variant="ghost">ปฏิเสธ</SubmitButton>
          </div>
        </ActionForm>
      )}
      {side === "seller" && a.status === "confirmed" && !upcoming && (
        <ActionForm action={updateAppointment} className="mt-3 flex gap-2">
          <input type="hidden" name="id" value={a.id} />
          <SubmitButton name="status" value="completed" size="sm">ชมเสร็จแล้ว</SubmitButton>
          <SubmitButton name="status" value="no_show" size="sm" variant="ghost">ไม่มาตามนัด</SubmitButton>
        </ActionForm>
      )}
      {(a.status === "pending" || (a.status === "confirmed" && upcoming)) && (
        <ActionForm action={updateAppointment} className="mt-2">
          <input type="hidden" name="id" value={a.id} />
          <SubmitButton name="status" value="cancelled" size="sm" variant="ghost" className="text-red-300">ยกเลิกนัด</SubmitButton>
        </ActionForm>
      )}
    </Card>
  );
}

const offerTone = { pending: "warning", countered: "info", accepted: "accent", rejected: "danger" } as const;

export function OfferCard({ o, side, property, other }: { o: Offer; side: "seller" | "buyer"; property: Prop; other: Party }) {
  const [countering, setCountering] = useState(false);
  const diff = ((Number(o.offer_price) - Number(o.listed_price)) / Number(o.listed_price)) * 100;
  const live = (o.status === "pending" || o.status === "countered") && new Date(o.valid_until) > new Date();

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold text-accent-strong">
            {formatTHB(o.offer_price)}
            {o.kind === "rent" && <span className="text-xs text-subtle">/เดือน</span>}
            <span className={`ml-2 text-xs ${diff < 0 ? "text-amber-300" : "text-accent"}`}>
              ({diff > 0 ? "+" : ""}{diff.toFixed(1)}% จากราคาตั้ง {formatTHB(o.listed_price)})
            </span>
          </p>
          <Link href={`/property/${property?.code}`} className="text-xs text-subtle hover:text-fg">{property?.title}</Link>
          <p className="text-sm text-muted">{side === "seller" ? "ผู้เสนอ" : "ผู้ขาย"}: {other?.display_name} · มีผลถึง {formatDate(o.valid_until)}</p>
        </div>
        <Badge tone={offerTone[o.status as keyof typeof offerTone] ?? "neutral"}>{OFFER_STATUS_LABEL[o.status]}</Badge>
      </div>
      {o.buyer_note && <p className="mt-2 text-sm text-muted">💬 {o.buyer_note}</p>}
      {o.counter_price && <p className="mt-1 text-sm">ราคาที่ผู้ขายเสนอกลับ: <b className="text-sky-300">{formatTHB(o.counter_price)}</b></p>}
      {o.seller_note && <p className="mt-1 text-sm text-muted">📝 ผู้ขาย: {o.seller_note}</p>}

      {live && side === "seller" && o.status === "pending" && (
        <ActionForm action={respondOffer} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={o.id} />
          {countering && (
            <>
              <Input name="counter_price" type="number" min={1} required placeholder="ราคาที่ต้องการเสนอกลับ" />
              <FieldError name="counter_price" />
            </>
          )}
          <Textarea name="seller_note" placeholder="ข้อความถึงผู้เสนอ (ไม่บังคับ)" className="min-h-16" />
          <div className="flex flex-wrap gap-2">
            {countering ? (
              <>
                <SubmitButton name="status" value="countered" size="sm">ส่งราคาเสนอกลับ</SubmitButton>
                <button type="button" onClick={() => setCountering(false)} className="text-sm text-subtle">ยกเลิก</button>
              </>
            ) : (
              <>
                <SubmitButton name="status" value="accepted" size="sm">ตอบรับข้อเสนอ</SubmitButton>
                <button type="button" onClick={() => setCountering(true)} className="rounded-xl border border-line px-3 text-sm">เสนอราคากลับ</button>
                <SubmitButton name="status" value="rejected" size="sm" variant="ghost">ปฏิเสธ</SubmitButton>
              </>
            )}
          </div>
        </ActionForm>
      )}
      {live && side === "buyer" && (
        <ActionForm action={respondOffer} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="id" value={o.id} />
          {o.status === "countered" && (
            <>
              <SubmitButton name="status" value="accepted" size="sm">ยอมรับราคา {formatTHB(o.counter_price)}</SubmitButton>
              <SubmitButton name="status" value="rejected" size="sm" variant="secondary">ไม่รับ</SubmitButton>
            </>
          )}
          <SubmitButton name="status" value="withdrawn" size="sm" variant="ghost" className="text-red-300">ถอนข้อเสนอ</SubmitButton>
        </ActionForm>
      )}
      {o.status === "accepted" && (
        <p className="mt-3 rounded-2xl bg-accent/10 px-3 py-2 text-sm text-accent-strong">
          🎉 ตกลงราคากันแล้ว ขั้นต่อไป: นัดทำสัญญาจะซื้อจะขาย/สัญญาเช่า และวางเงินมัดจำกับคู่สัญญาโดยตรง
        </p>
      )}
    </Card>
  );
}
