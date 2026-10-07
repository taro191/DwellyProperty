"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";

const uuid = z.uuid();
const phone = z.string().trim().regex(/^[0-9+\- ]{9,20}$/, "เบอร์โทรไม่ถูกต้อง");
const money = (msg: string) => z.coerce.number(msg).positive(msg).max(9_999_999_999);

type Ctx =
  | { error: { ok: false; error: string } }
  | { viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>; supabase: Awaited<ReturnType<typeof createClient>> };

async function signedInClient(): Promise<Ctx> {
  const viewer = await getViewer();
  if (!viewer) return { error: { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" } };
  return { viewer, supabase: await createClient() };
}

export async function toggleFavorite(propertyId: string, save: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(propertyId).success) return { ok: false, error: "invalid" };
  const ctx = await signedInClient();
  if ("error" in ctx) return ctx.error;
  const { viewer, supabase } = ctx;
  const { error } = save
    ? await supabase.from("favorites").upsert({ user_id: viewer.id, property_id: propertyId }, { ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", viewer.id).eq("property_id", propertyId);
  if (error) return dbError(error);
  revalidatePath("/me/favorites");
  return { ok: true };
}

export async function trackView(propertyId: string): Promise<void> {
  if (!uuid.safeParse(propertyId).success) return;
  const supabase = await createClient();
  await supabase.rpc("track_property_view", { p_property_id: propertyId });
}

export async function revealContact(propertyId: string): Promise<ActionResult<{ name: string; phone: string | null; line_id: string | null }>> {
  if (!uuid.safeParse(propertyId).success) return { ok: false, error: "invalid" };
  const ctx = await signedInClient();
  if ("error" in ctx) return ctx.error;
  const { data, error } = await ctx.supabase.rpc("reveal_listing_contact", { p_property_id: propertyId });
  if (error) return dbError(error);
  const row = (data as { display_name: string; phone: string | null; line_id: string | null }[])[0];
  if (!row) return { ok: false, error: "ไม่พบข้อมูลติดต่อ" };
  return { ok: true, data: { name: row.display_name, phone: row.phone, line_id: row.line_id } };
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
  const ctx = await signedInClient();
  if ("error" in ctx) return ctx.error;
  // buyer_id / seller_id are filled by the deal_row_defaults trigger.
  const { error } = await ctx.supabase.from("inquiries").insert({ ...parsed.data, buyer_id: ctx.viewer.id, seller_id: ctx.viewer.id });
  if (error) return dbError(error);
  return { ok: true, message: "ส่งข้อความถึงผู้ขายแล้ว ผู้ขายจะติดต่อกลับโดยเร็ว" };
}

const appointmentSchema = z.object({
  property_id: uuid,
  format: z.enum(["onsite", "video"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "เลือกวันที่"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "เลือกเวลา"),
  buyer_note: z.string().trim().max(1000).optional(),
});

export async function requestAppointment(fd: FormData): Promise<ActionResult> {
  const parsed = appointmentSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const ctx = await signedInClient();
  if ("error" in ctx) return ctx.error;
  const { property_id, format, date, time, buyer_note } = parsed.data;
  const scheduledAt = new Date(`${date}T${time}:00+07:00`); // Asia/Bangkok
  if (Number.isNaN(scheduledAt.getTime())) return { ok: false, error: "วันเวลาไม่ถูกต้อง" };
  const { error } = await ctx.supabase.from("appointments").insert({
    property_id, format, buyer_note, scheduled_at: scheduledAt.toISOString(), buyer_id: ctx.viewer.id, seller_id: ctx.viewer.id,
  });
  if (error) return dbError(error);
  revalidatePath("/me/activity");
  return { ok: true, message: "ส่งคำขอนัดชมแล้ว รอผู้ขายยืนยัน" };
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
  const ctx = await signedInClient();
  if ("error" in ctx) return ctx.error;
  const { valid_days, ...rest } = parsed.data;
  const { error } = await ctx.supabase.from("offers").insert({
    ...rest,
    listed_price: 0, // replaced from the listing by trigger
    valid_until: new Date(Date.now() + valid_days * 86_400_000 + 60_000).toISOString(),
    buyer_id: ctx.viewer.id,
    seller_id: ctx.viewer.id,
  });
  if (error) return dbError(error);
  revalidatePath("/me/activity");
  return { ok: true, message: "ยื่นข้อเสนอแล้ว ติดตามสถานะได้ที่ “นัดหมายและข้อเสนอของฉัน”" };
}

export async function startChat(fd: FormData): Promise<void> {
  const propertyId = fd.get("property_id");
  if (!uuid.safeParse(propertyId).success) redirect("/messages");
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/messages");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", { p_property_id: propertyId });
  if (error) {
    console.error("[startChat]", error.message);
    redirect("/messages?error=start");
  }
  redirect(`/messages/${data}`);
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
  const ctx = await signedInClient();
  if ("error" in ctx) return ctx.error;
  const { error } = await ctx.supabase.from("reports").insert(parsed.data);
  if (error) return dbError(error);
  return { ok: true, message: "ขอบคุณที่แจ้ง ทีมงานจะตรวจสอบภายใน 24 ชั่วโมง" };
}
