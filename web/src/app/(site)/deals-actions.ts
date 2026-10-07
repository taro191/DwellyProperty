"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { attempt, formObject, invalid } from "@/lib/action-utils";
import * as deals from "@/server/services/deals";
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
  const viewer = await requireViewer();
  const parsed = leadSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...rest } = parsed.data;
  const r = await attempt(() => deals.updateInquiry(viewer, id, rest), "บันทึกแล้ว");
  refresh();
  return r;
}

const apptSchema = z.object({
  id: z.uuid(),
  status: z.enum(["confirmed", "declined", "cancelled", "completed", "no_show"]),
  seller_note: z.string().trim().max(1000).optional(),
  meeting_url: z.url("ลิงก์วิดีโอคอลไม่ถูกต้อง").optional(),
});

/** Used by both parties; the service decides which transitions each side may make. */
export async function updateAppointment(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = apptSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...rest } = parsed.data;
  const r = await attempt(() => deals.updateAppointment(viewer, id, rest));
  refresh();
  return r;
}

const offerSchema = z.object({
  id: z.uuid(),
  status: z.enum(["accepted", "rejected", "countered", "withdrawn"]),
  counter_price: z.coerce.number("ราคาไม่ถูกต้อง").positive("ราคาไม่ถูกต้อง").optional(),
  seller_note: z.string().trim().max(2000).optional(),
});

export async function respondOffer(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = offerSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...rest } = parsed.data;
  const r = await attempt(() => deals.respondOffer(viewer, id, rest));
  refresh();
  return r;
}
