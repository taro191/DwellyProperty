"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";

function refresh() {
  for (const p of ["/dashboard", "/dashboard/leads", "/dashboard/appointments", "/dashboard/offers", "/me/activity"]) revalidatePath(p);
}

const leadSchema = z.object({
  id: z.uuid(),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]),
  seller_notes: z.string().trim().max(2000).optional(),
});

export async function updateLead(fd: FormData): Promise<ActionResult> {
  await requireViewer();
  const parsed = leadSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").update({ ...rest, seller_notes: rest.seller_notes ?? null }).eq("id", id);
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: "บันทึกแล้ว" };
}

const apptSchema = z.object({
  id: z.uuid(),
  status: z.enum(["confirmed", "declined", "cancelled", "completed", "no_show"]),
  seller_note: z.string().trim().max(1000).optional(),
  meeting_url: z.url("ลิงก์วิดีโอคอลไม่ถูกต้อง").optional(),
});

/** Used by both parties; the DB guard decides which transitions each side may make. */
export async function updateAppointment(fd: FormData): Promise<ActionResult> {
  await requireViewer();
  const parsed = apptSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...rest } = parsed.data;
  const patch: Record<string, unknown> = { status: rest.status };
  if (rest.seller_note !== undefined) patch.seller_note = rest.seller_note;
  if (rest.meeting_url !== undefined) patch.meeting_url = rest.meeting_url;
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").update(patch).eq("id", id);
  if (error) return dbError(error);
  refresh();
  return { ok: true };
}

const offerSchema = z.object({
  id: z.uuid(),
  status: z.enum(["accepted", "rejected", "countered", "withdrawn"]),
  counter_price: z.coerce.number("ราคาไม่ถูกต้อง").positive("ราคาไม่ถูกต้อง").optional(),
  seller_note: z.string().trim().max(2000).optional(),
});

export async function respondOffer(fd: FormData): Promise<ActionResult> {
  await requireViewer();
  const parsed = offerSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...rest } = parsed.data;
  if (rest.status === "countered" && !rest.counter_price) return { ok: false, error: "กรุณาระบุราคาที่ต้องการเสนอกลับ" };
  const supabase = await createClient();
  const { error } = await supabase.from("offers").update(rest).eq("id", id);
  if (error) return dbError(error);
  refresh();
  return { ok: true };
}
