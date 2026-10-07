"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid } from "@/lib/action-utils";
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
  const supabase = await createClient();
  if (!viewer.roles.includes("agent")) {
    const { error } = await supabase.from("user_roles").insert({ user_id: viewer.id, role: "agent" });
    if (error) return dbError(error);
  }
  const { error } = await supabase.from("agent_profiles").upsert({ user_id: viewer.id, ...parsed.data });
  if (error) return dbError(error);
  revalidatePath("/dashboard/agent");
  return { ok: true, message: "บันทึกโปรไฟล์นายหน้าแล้ว" };
}

export async function requestPartnerAccess(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/agent");
  const message = z.string().trim().max(1000).optional().safeParse(fd.get("message") || undefined);
  const supabase = await createClient();
  const { error } = await supabase.from("commission_access_requests").insert({ agent_id: viewer.id, message: message.data ?? null });
  if (error) return dbError(error);
  revalidatePath("/dashboard/agent");
  return { ok: true, message: "ส่งคำขอแล้ว ทีมงานจะตรวจสอบใบอนุญาตและแจ้งผลทางการแจ้งเตือน" };
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
  const supabase = await createClient();
  const { error } = await supabase.from("agency_pods").insert({ ...parsed.data, leader_id: viewer.id });
  if (error) return dbError(error);
  revalidatePath("/dashboard/agent");
  return { ok: true, message: "สร้าง Pod แล้ว รอทีมงานตรวจสอบเพื่อรับป้าย Verified Pod" };
}
