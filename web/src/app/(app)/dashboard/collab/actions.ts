"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { attempt, formObject, invalid } from "@/lib/action-utils";
import * as collab from "@/server/services/collab";
import type { ActionResult } from "@/lib/types";

const deal = z.enum(["sale", "rent"]);
const refresh = () => {
  revalidatePath("/dashboard/collab");
  revalidatePath("/dashboard/agent/collab");
};

const assignSchema = z.object({
  property_id: z.uuid(),
  agent_id: z.uuid("เลือกนายหน้า"),
  deal,
  contract: z.enum(["open_multi", "exclusive"]),
  commission: z.string().trim().min(1, "ระบุอัตราค่าคอมมิชชั่น").max(80),
});

export async function assignAgent(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/collab");
  const parsed = assignSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => collab.assignAgent(viewer, parsed.data), "แต่งตั้งนายหน้าแล้ว ระบบแจ้งนายหน้าเรียบร้อย");
  refresh();
  return r;
}

export async function endAgent(id: string): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/collab");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "invalid" };
  const r = await attempt(() => collab.endAgent(viewer, id), "ยกเลิกการแต่งตั้งแล้ว");
  refresh();
  return r;
}

const noticeSchema = z.object({ property_id: z.uuid(), deal, summary: z.string().trim().min(3, "พิมพ์ข้อความแจ้งนายหน้า").max(2000) });

export async function postNotice(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/collab");
  const parsed = noticeSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(async () => {
    const n = await collab.postOwnerNotice(viewer, parsed.data);
    return n;
  }, "ส่งข้อความแจ้งนายหน้าทุกคนแล้ว");
  refresh();
  return r;
}

const logSchema = z.object({
  property_id: z.uuid(),
  deal,
  kind: z.enum(["viewing", "lead_lock", "customer_feedback", "offer_submitted", "marketing"]),
  client_name: z.string().trim().max(80).optional(),
  client_phone_last4: z.string().trim().regex(/^\d{4}$/, "ใส่เบอร์ 4 ตัวท้าย").optional(),
  amount: z.coerce.number().positive().max(1e10).optional(),
  interest: z.enum(["ready_to_book", "interested_high", "considering"]).optional(),
  summary: z.string().trim().min(3, "ระบุรายละเอียด").max(2000),
});

export async function logActivity(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/agent/collab");
  for (const k of ["client_name", "client_phone_last4", "amount", "interest"]) if (!String(fd.get(k) ?? "").trim()) fd.delete(k);
  const parsed = logSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => collab.logAgentActivity(viewer, parsed.data), "ส่งรายงานให้เจ้าของทรัพย์แล้ว");
  refresh();
  return r;
}
