"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { attempt, fail, formObject, invalid } from "@/lib/action-utils";
import * as listings from "@/server/services/listings";
import * as deals from "@/server/services/deals";
import { startConversation } from "@/server/services/chat";
import { createReport } from "@/server/services/trust";
import type { ActionResult } from "@/lib/types";

const uuid = z.uuid();
const phone = z.string().trim().regex(/^[0-9+\- ]{9,20}$/, "เบอร์โทรไม่ถูกต้อง");
const money = (msg: string) => z.coerce.number(msg).positive(msg).max(9_999_999_999);
const signInFirst: ActionResult<never> = { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };

export async function toggleFavorite(propertyId: string, save: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(propertyId).success) return { ok: false, error: "invalid" };
  const viewer = await getViewer();
  if (!viewer) return signInFirst;
  const r = await attempt(() => listings.setFavorite(viewer, propertyId, save));
  revalidatePath("/me/favorites");
  return r;
}

export async function trackView(propertyId: string): Promise<void> {
  if (!uuid.safeParse(propertyId).success) return;
  const viewer = await getViewer();
  await listings.trackView(propertyId, viewer?.id ?? null).catch((e) => console.error("[trackView]", e));
}

export async function revealContact(propertyId: string): Promise<ActionResult<{ name: string; phone: string | null; line_id: string | null }>> {
  if (!uuid.safeParse(propertyId).success) return { ok: false, error: "invalid" };
  const viewer = await getViewer();
  if (!viewer) return signInFirst;
  return attempt(() => listings.revealContact(viewer, propertyId));
}

const inquirySchema = z.object({
  property_id: uuid,
  intent: z.enum(["buy", "rent", "invest", "info"]),
  message: z.string().trim().min(5, "พิมพ์ข้อความอย่างน้อย 5 ตัวอักษร").max(2000),
  contact_phone: phone.optional(),
  budget: money("งบประมาณไม่ถูกต้อง").optional(),
});

export async function sendInquiry(fd: FormData): Promise<ActionResult> {
  const parsed = inquirySchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const viewer = await getViewer();
  if (!viewer) return signInFirst;
  return attempt(() => deals.createInquiry(viewer, parsed.data), "ส่งข้อความถึงผู้ขายแล้ว ผู้ขายจะติดต่อกลับโดยเร็ว");
}

const appointmentSchema = z.object({
  property_id: uuid,
  format: z.enum(["onsite", "video", "phone"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "เลือกวันที่"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "เลือกเวลา"),
  buyer_note: z.string().trim().max(1000).optional(),
});

export async function requestAppointment(fd: FormData): Promise<ActionResult> {
  const parsed = appointmentSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const viewer = await getViewer();
  if (!viewer) return signInFirst;
  const { date, time, ...rest } = parsed.data;
  const scheduledAt = new Date(`${date}T${time}:00+07:00`); // Asia/Bangkok
  if (Number.isNaN(scheduledAt.getTime())) return { ok: false, error: "วันเวลาไม่ถูกต้อง" };
  const r = await attempt(() => deals.createAppointment(viewer, { ...rest, scheduled_at: scheduledAt.toISOString() }), "ส่งคำขอนัดชมแล้ว รอผู้ขายยืนยัน");
  revalidatePath("/me/activity");
  return r;
}

const offerSchema = z.object({
  property_id: uuid,
  kind: z.enum(["purchase", "rent"]),
  offer_price: money("ราคาเสนอไม่ถูกต้อง"),
  valid_days: z.coerce.number().int().min(1).max(30).default(7),
  buyer_note: z.string().trim().max(2000).optional(),
});

export async function makeOffer(fd: FormData): Promise<ActionResult> {
  const parsed = offerSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const viewer = await getViewer();
  if (!viewer) return signInFirst;
  const r = await attempt(() => deals.createOffer(viewer, parsed.data), "ยื่นข้อเสนอแล้ว ติดตามสถานะได้ที่ “นัดหมายและข้อเสนอของฉัน”");
  revalidatePath("/me/activity");
  return r;
}

export async function startChat(fd: FormData): Promise<void> {
  const propertyId = fd.get("property_id");
  if (!uuid.safeParse(propertyId).success) redirect("/messages");
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/messages");
  let id: string;
  try {
    id = await startConversation(viewer, propertyId as string);
  } catch (e) {
    fail(e);
    redirect("/messages?error=start");
  }
  redirect(`/messages/${id}`);
}

const reportSchema = z.object({
  target_type: z.enum(["property", "user", "message", "review"]),
  target_id: uuid,
  reason: z.enum(["scam", "fake_listing", "wrong_info", "duplicate", "already_sold", "harassment", "spam", "other"], "เลือกเหตุผล"),
  details: z.string().trim().max(2000).optional(),
});

export async function submitReport(fd: FormData): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const viewer = await getViewer();
  if (!viewer) return signInFirst;
  return attempt(() => createReport(viewer, parsed.data), "ขอบคุณที่แจ้ง ทีมงานจะตรวจสอบภายใน 24 ชั่วโมง");
}
