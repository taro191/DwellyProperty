"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { attempt, formObject, invalid } from "@/lib/action-utils";
import * as trust from "@/server/services/trust";
import type { ActionResult } from "@/lib/types";

const profileSchema = z.object({
  english_name: z.string().trim().max(80).optional(),
  title: z.string().trim().max(120).optional(),
  company_name: z.string().trim().max(120).optional(),
  license_no: z.string().trim().max(50).optional(),
  experience_years: z.coerce.number().int().min(0).max(70).optional(),
  specialized_categories: z.array(z.enum(["condo", "house", "townhome", "land", "apartment", "commercial"])).default([]),
});

export async function saveAgentProfile(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/agent");
  const parsed = profileSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => trust.saveAgentProfile(viewer, parsed.data), "บันทึกโปรไฟล์นายหน้าแล้ว");
  revalidatePath("/dashboard/agent", "layout");
  return r;
}

export async function requestPartnerAccess(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/agent");
  const message = String(fd.get("message") ?? "").trim().slice(0, 1000) || undefined;
  const r = await attempt(() => trust.requestPartnerAccess(viewer, message), "ส่งคำขอแล้ว ทีมงานจะตรวจสอบใบอนุญาตและแจ้งผลทางการแจ้งเตือน");
  revalidatePath("/dashboard/agent", "layout");
  return r;
}

const podSchema = z.object({
  name: z.string().trim().min(3, "ชื่อ Pod อย่างน้อย 3 ตัวอักษร").max(80),
  description: z.string().trim().max(1000).optional(),
  zone_id: z.uuid().optional(),
});

export async function createPod(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/agent");
  const parsed = podSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => trust.createPod(viewer, parsed.data), "สร้าง Pod แล้ว รอทีมงานตรวจสอบเพื่อรับป้าย Verified Pod");
  revalidatePath("/dashboard/agent", "layout");
  return r;
}
