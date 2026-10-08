import "server-only";
import { alias } from "drizzle-orm/mysql-core";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { appointments, inquiries, offers, profiles, properties } from "@/server/db/schema";
import { AppError, DAY, forbidden, isoIn, notFound, notify, requireActive, type Actor, type Tx } from "./core";
import type { AppointmentStatus, InquiryStatus, OfferStatus } from "@/lib/types";

const fmtTHB = (n: number) => "฿" + Math.round(n).toLocaleString("en-US");
const bkk = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(iso));

/** Buyer-side guard shared by inquiries/appointments/offers: listing must be live and not your own. */
async function dealTarget(tx: Tx, actor: Actor, propertyId: string) {
  const [p] = await tx.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!p) throw notFound("ไม่พบประกาศ");
  if (!["active", "reserved"].includes(p.status)) throw new AppError("ประกาศนี้ไม่เปิดรับคำขอแล้ว");
  if (actor.id === p.owner_id || actor.id === p.agent_id) throw new AppError("ไม่สามารถทำรายการกับประกาศของตัวเองได้");
  return { property: p, sellerId: p.agent_id ?? p.owner_id };
}

// ---------------------------------------------------------------------------
// Inquiries (leads)
// ---------------------------------------------------------------------------
export async function createInquiry(actor: Actor, v: {
  property_id: string; intent: "buy" | "rent" | "invest" | "info"; message: string; contact_phone?: string; budget?: number;
}) {
  requireActive(actor);
  await db.transaction(async (tx) => {
    const { sellerId } = await dealTarget(tx, actor, v.property_id);
    const id = crypto.randomUUID();
    await tx.insert(inquiries).values({
      id, property_id: v.property_id, buyer_id: actor.id, seller_id: sellerId, intent: v.intent, message: v.message,
      contact_phone: v.contact_phone ?? null, budget: v.budget ?? null,
    });
    await tx.update(properties).set({ inquiries_count: sql`${properties.inquiries_count} + 1` }).where(eq(properties.id, v.property_id));
    await notify(tx, sellerId, { type: "inquiry", title: "มีผู้สนใจทรัพย์ของคุณ", body: v.message.slice(0, 140), link: "/dashboard/leads", entityType: "inquiry", entityId: id });
  });
}

/** Seller updates pipeline status and private notes. */
export async function updateInquiry(actor: Actor, id: string, v: { status: InquiryStatus; seller_notes?: string | null }) {
  requireActive(actor);
  const [row] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
  if (!row) throw notFound();
  if (row.seller_id !== actor.id) throw forbidden("เฉพาะผู้ดูแลประกาศเท่านั้น");
  await db.update(inquiries).set({ status: v.status, seller_notes: v.seller_notes ?? null }).where(eq(inquiries.id, id));
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
export async function createAppointment(actor: Actor, v: {
  property_id: string; format: "onsite" | "video" | "phone"; scheduled_at: string; buyer_note?: string;
}) {
  requireActive(actor);
  if (new Date(v.scheduled_at).getTime() < Date.now() + 3_600_000) throw new AppError("กรุณานัดล่วงหน้าอย่างน้อย 1 ชั่วโมง");
  if (new Date(v.scheduled_at).getTime() > Date.now() + 90 * DAY) throw new AppError("นัดล่วงหน้าได้ไม่เกิน 90 วัน");
  await db.transaction(async (tx) => {
    const { sellerId } = await dealTarget(tx, actor, v.property_id);
    const id = crypto.randomUUID();
    await tx.insert(appointments).values({
      id, property_id: v.property_id, buyer_id: actor.id, seller_id: sellerId, format: v.format,
      scheduled_at: v.scheduled_at, buyer_note: v.buyer_note ?? null,
    });
    await notify(tx, sellerId, { type: "appointment", title: "มีคำขอนัดชมทรัพย์ใหม่", body: bkk(v.scheduled_at), link: "/dashboard/appointments", entityType: "appointment", entityId: id });
  });
}

const APPT_TITLE: Partial<Record<AppointmentStatus, string>> = {
  confirmed: "ยืนยันนัดชมแล้ว", declined: "นัดชมถูกปฏิเสธ", cancelled: "นัดชมถูกยกเลิก", completed: "นัดชมเสร็จสิ้น", no_show: "บันทึกว่าไม่มาตามนัด",
};

export async function updateAppointment(actor: Actor, id: string, v: { status: AppointmentStatus; seller_note?: string; meeting_url?: string }) {
  requireActive(actor);
  await db.transaction(async (tx) => {
    const [a] = await tx.select().from(appointments).where(eq(appointments.id, id)).limit(1).for("update");
    if (!a) throw notFound();
    const isSeller = actor.id === a.seller_id;
    const isBuyer = actor.id === a.buyer_id;
    const ok =
      (isSeller && ((a.status === "pending" && ["confirmed", "declined", "cancelled"].includes(v.status))
        || (a.status === "confirmed" && ["completed", "no_show", "cancelled"].includes(v.status))))
      || (isBuyer && ["pending", "confirmed"].includes(a.status) && v.status === "cancelled");
    if (!ok) throw new AppError("ไม่สามารถดำเนินการนี้ได้ในสถานะปัจจุบัน");

    await tx.update(appointments).set({
      status: v.status,
      ...(isSeller && v.seller_note !== undefined ? { seller_note: v.seller_note } : {}),
      ...(isSeller && v.meeting_url !== undefined ? { meeting_url: v.meeting_url } : {}),
      ...(v.status === "cancelled" ? { cancelled_by: actor.id } : {}),
    }).where(eq(appointments.id, id));

    await notify(tx, isSeller ? a.buyer_id : a.seller_id, {
      type: "appointment", title: APPT_TITLE[v.status] ?? "อัปเดตนัดชม", body: bkk(a.scheduled_at),
      link: isSeller ? "/me/activity" : "/dashboard/appointments", entityType: "appointment", entityId: id,
    });
  });
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------
export async function createOffer(actor: Actor, v: {
  property_id: string; kind: "purchase" | "rent"; offer_price: number; valid_days: number; buyer_note?: string;
}) {
  requireActive(actor);
  if (v.valid_days < 1 || v.valid_days > 30) throw new AppError("ระยะเวลาข้อเสนอต้องอยู่ระหว่าง 1–30 วัน");
  await db.transaction(async (tx) => {
    const { property, sellerId } = await dealTarget(tx, actor, v.property_id);
    const listed = v.kind === "purchase" ? property.sale_price : property.rent_price;
    if (listed == null) throw new AppError(v.kind === "purchase" ? "ประกาศนี้ไม่ได้ขาย" : "ประกาศนี้ไม่ได้ให้เช่า");
    const id = crypto.randomUUID();
    await tx.insert(offers).values({
      id, property_id: v.property_id, buyer_id: actor.id, seller_id: sellerId, kind: v.kind,
      listed_price: Number(listed), offer_price: v.offer_price, buyer_note: v.buyer_note ?? null,
      valid_until: isoIn(v.valid_days * DAY),
    });
    await notify(tx, sellerId, { type: "offer", title: "ได้รับข้อเสนอใหม่", body: `ราคาเสนอ ${fmtTHB(v.offer_price)}`, link: "/dashboard/offers", entityType: "offer", entityId: id });
  });
}

const OFFER_TITLE: Partial<Record<OfferStatus, string>> = {
  accepted: "ข้อเสนอได้รับการตอบรับ", rejected: "ข้อเสนอถูกปฏิเสธ", countered: "ผู้ขายยื่นราคาโต้กลับ", withdrawn: "ผู้ซื้อถอนข้อเสนอ",
};

export async function respondOffer(actor: Actor, id: string, v: {
  status: "accepted" | "rejected" | "countered" | "withdrawn"; counter_price?: number; seller_note?: string;
}) {
  requireActive(actor);
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(offers).where(eq(offers.id, id)).limit(1).for("update");
    if (!o) throw notFound();
    if (["pending", "countered"].includes(o.status) && new Date(o.valid_until).getTime() < Date.now()) {
      throw new AppError("ข้อเสนอนี้หมดอายุแล้ว");
    }
    const isSeller = actor.id === o.seller_id;
    const isBuyer = actor.id === o.buyer_id;
    const ok =
      (isSeller && o.status === "pending" && ["accepted", "rejected", "countered"].includes(v.status))
      || (isBuyer && ["pending", "countered"].includes(o.status) && v.status === "withdrawn")
      || (isBuyer && o.status === "countered" && ["accepted", "rejected"].includes(v.status));
    if (!ok) throw new AppError("ไม่สามารถดำเนินการนี้ได้ในสถานะปัจจุบัน");
    if (v.status === "countered" && !v.counter_price) throw new AppError("กรุณาระบุราคาที่ต้องการเสนอกลับ");

    await tx.update(offers).set({
      status: v.status,
      responded_at: new Date().toISOString(),
      ...(isSeller && v.seller_note !== undefined ? { seller_note: v.seller_note } : {}),
      ...(v.status === "countered"
        ? { counter_price: v.counter_price, valid_until: new Date(Math.max(new Date(o.valid_until).getTime(), Date.now() + 3 * DAY)).toISOString() }
        : {}),
    }).where(eq(offers.id, id));

    await notify(tx, isSeller ? o.buyer_id : o.seller_id, {
      type: "offer", title: OFFER_TITLE[v.status] ?? "อัปเดตข้อเสนอ",
      body: v.status === "countered" && v.counter_price ? `ราคาใหม่ ${fmtTHB(v.counter_price)}` : null,
      link: isSeller ? "/me/activity" : "/dashboard/offers", entityType: "offer", entityId: id,
    });
  });
}

// ---------------------------------------------------------------------------
// Lists (with property + counterpart name)
// ---------------------------------------------------------------------------
const other = alias(profiles, "other");
const propCols = { title: properties.title, code: properties.code };

export async function listInquiries(actor: Actor, side: "seller" | "buyer", status?: InquiryStatus) {
  const me = side === "seller" ? inquiries.seller_id : inquiries.buyer_id;
  const them = side === "seller" ? inquiries.buyer_id : inquiries.seller_id;
  const rows = await db.select({ i: inquiries, properties: propCols, other_name: other.display_name })
    .from(inquiries).innerJoin(properties, eq(properties.id, inquiries.property_id)).innerJoin(other, eq(other.id, them))
    .where(and(eq(me, actor.id), status ? eq(inquiries.status, status) : undefined))
    .orderBy(desc(inquiries.created_at)).limit(200);
  return rows.map((r) => ({ ...r.i, properties: r.properties, party: { display_name: r.other_name } }));
}

export async function listAppointments(actor: Actor, side: "seller" | "buyer") {
  const me = side === "seller" ? appointments.seller_id : appointments.buyer_id;
  const them = side === "seller" ? appointments.buyer_id : appointments.seller_id;
  const rows = await db.select({ a: appointments, properties: propCols, other_name: other.display_name })
    .from(appointments).innerJoin(properties, eq(properties.id, appointments.property_id)).innerJoin(other, eq(other.id, them))
    .where(eq(me, actor.id)).orderBy(side === "seller" ? asc(appointments.scheduled_at) : desc(appointments.scheduled_at)).limit(200);
  return rows.map((r) => ({ ...r.a, properties: r.properties, party: { display_name: r.other_name } }));
}

export async function listOffers(actor: Actor, side: "seller" | "buyer") {
  const me = side === "seller" ? offers.seller_id : offers.buyer_id;
  const them = side === "seller" ? offers.buyer_id : offers.seller_id;
  const rows = await db.select({ o: offers, properties: propCols, other_name: other.display_name })
    .from(offers).innerJoin(properties, eq(properties.id, offers.property_id)).innerJoin(other, eq(other.id, them))
    .where(eq(me, actor.id)).orderBy(desc(offers.created_at)).limit(200);
  return rows.map((r) => ({ ...r.o, properties: r.properties, party: { display_name: r.other_name } }));
}

export async function sellerCounts(actor: Actor) {
  const [[leads], [appts], [offs]] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(inquiries).where(and(eq(inquiries.seller_id, actor.id), eq(inquiries.status, "new"))),
    db.select({ n: sql<number>`count(*)` }).from(appointments).where(and(eq(appointments.seller_id, actor.id), eq(appointments.status, "pending"))),
    db.select({ n: sql<number>`count(*)` }).from(offers).where(and(eq(offers.seller_id, actor.id), eq(offers.status, "pending"))),
  ]);
  return { newLeads: Number(leads.n), pendingAppts: Number(appts.n), pendingOffers: Number(offs.n) };
}
