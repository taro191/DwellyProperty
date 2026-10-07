"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, HandCoins, MessageCircle, Phone, Send } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { Alert, Button, Field, Input, Select, Textarea, buttonClass, cn } from "@/components/ui";
import { formatTHB } from "@/lib/format";
import type { ListingType } from "@/lib/types";
import { makeOffer, requestAppointment, revealContact, sendInquiry, startChat } from "../actions";

type Tab = "inquiry" | "visit" | "offer";

function bangkokDate(offsetDays: number) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d); // YYYY-MM-DD
}

const TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

export function PropertyActions({
  property, signedIn, loginHref,
}: {
  property: { id: string; listing_type: ListingType; sale_price: number | null; rent_price: number | null; accepting: boolean };
  signedIn: boolean;
  loginHref: string;
}) {
  const [tab, setTab] = useState<Tab>("inquiry");
  const [contact, setContact] = useState<{ name: string; phone: string | null; line_id: string | null } | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <div className="space-y-2">
        <Link href={loginHref} className={buttonClass("primary", "lg", "w-full")}>เข้าสู่ระบบเพื่อติดต่อผู้ขาย</Link>
        <p className="text-center text-xs text-subtle">ฟรี ใช้ Google หรืออีเมลก็ได้</p>
      </div>
    );
  }
  if (!property.accepting) {
    return <Alert tone="neutral">ประกาศนี้ปิดรับการติดต่อแล้ว</Alert>;
  }

  const offerKinds = [
    property.listing_type !== "rent" && { value: "purchase", label: `ซื้อ (ราคาตั้ง ${formatTHB(property.sale_price)})` },
    property.listing_type !== "sale" && { value: "rent", label: `เช่า (ราคาตั้ง ${formatTHB(property.rent_price)}/ด.)` },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <form action={startChat}>
          <input type="hidden" name="property_id" value={property.id} />
          <button className={buttonClass("primary", "md", "w-full")}>
            <MessageCircle className="h-4 w-4" /> แชท
          </button>
        </form>
        <Button
          variant="secondary"
          disabled={pending || Boolean(contact)}
          onClick={() =>
            startTransition(async () => {
              const r = await revealContact(property.id);
              if (r.ok && r.data) setContact(r.data);
              else if (!r.ok) setContactError(r.error);
            })
          }
        >
          <Phone className="h-4 w-4" /> {pending ? "กำลังโหลด…" : "ดูเบอร์โทร"}
        </Button>
      </div>
      {contact && (
        <div className="rounded-2xl bg-surface-2 p-3 text-sm">
          <p className="font-semibold">{contact.name}</p>
          {contact.phone ? <a href={`tel:${contact.phone}`} className="block text-accent">{contact.phone}</a> : <p className="text-subtle">ไม่ได้ระบุเบอร์โทร</p>}
          {contact.line_id && <p className="text-muted">LINE: {contact.line_id}</p>}
        </div>
      )}
      {contactError && <Alert tone="danger">{contactError}</Alert>}

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1 text-xs">
        {([
          ["inquiry", "สอบถาม", Send],
          ["visit", "นัดชม", CalendarClock],
          ["offer", "ยื่นข้อเสนอ", HandCoins],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn("flex items-center justify-center gap-1 rounded-xl py-2 font-semibold", tab === key ? "bg-surface text-fg" : "text-subtle")}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "inquiry" && (
        <ActionForm action={sendInquiry} className="space-y-3" resetOnSuccess>
          <input type="hidden" name="property_id" value={property.id} />
          <Select name="intent" defaultValue={property.listing_type === "rent" ? "rent" : "buy"} aria-label="วัตถุประสงค์">
            <option value="buy">ต้องการซื้อ</option>
            <option value="rent">ต้องการเช่า</option>
            <option value="invest">ซื้อเพื่อลงทุน</option>
            <option value="info">สอบถามข้อมูล</option>
          </Select>
          <Textarea name="message" required minLength={5} placeholder="สวัสดีครับ สนใจทรัพย์นี้ ยังว่างอยู่ไหมครับ" />
          <FieldError name="message" />
          <Input name="contact_phone" type="tel" placeholder="เบอร์ติดต่อกลับ (ไม่บังคับ)" />
          <FieldError name="contact_phone" />
          <SubmitButton className="w-full" pendingText="กำลังส่ง…">ส่งข้อความ</SubmitButton>
        </ActionForm>
      )}

      {tab === "visit" && (
        <ActionForm action={requestAppointment} className="space-y-3">
          <input type="hidden" name="property_id" value={property.id} />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-2.5 text-sm">
              <input type="radio" name="format" value="onsite" defaultChecked className="accent-emerald-500" /> ชมสถานที่จริง
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-2.5 text-sm">
              <input type="radio" name="format" value="video" className="accent-emerald-500" /> วิดีโอคอล
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="วันที่">
              <Input name="date" type="date" required min={bangkokDate(0)} max={bangkokDate(60)} defaultValue={bangkokDate(1)} />
            </Field>
            <Field label="เวลา">
              <Select name="time" defaultValue="10:00">
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t} น.</option>)}
              </Select>
            </Field>
          </div>
          <Textarea name="buyer_note" placeholder="หมายเหตุถึงผู้ขาย (ไม่บังคับ)" className="min-h-20" />
          <SubmitButton className="w-full" pendingText="กำลังส่ง…">ขอนัดชม</SubmitButton>
        </ActionForm>
      )}

      {tab === "offer" && (
        <ActionForm action={makeOffer} className="space-y-3">
          <input type="hidden" name="property_id" value={property.id} />
          <Select name="kind" defaultValue={offerKinds[0]?.value} aria-label="ประเภทข้อเสนอ">
            {offerKinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </Select>
          <Field label="ราคาที่เสนอ (บาท)">
            <Input name="offer_price" type="number" min={1} step={1000} required inputMode="numeric" />
            <FieldError name="offer_price" />
          </Field>
          <Field label="ข้อเสนอมีผลถึง">
            <Select name="valid_days" defaultValue="7">
              {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} วัน</option>)}
            </Select>
          </Field>
          <Textarea name="buyer_note" placeholder="เงื่อนไขเพิ่มเติม เช่น วันโอน การกู้ธนาคาร" className="min-h-20" />
          <SubmitButton className="w-full" pendingText="กำลังส่ง…">ยื่นข้อเสนอ</SubmitButton>
          <p className="text-xs text-subtle">ข้อเสนอไม่มีผลผูกพันทางกฎหมายจนกว่าจะทำสัญญาจะซื้อจะขาย/สัญญาเช่า</p>
        </ActionForm>
      )}
    </div>
  );
}
