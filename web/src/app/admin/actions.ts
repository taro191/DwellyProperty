"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";

const id = z.uuid();
const note = z.string().trim().max(2000).optional();

// Role checks here are for fast feedback; the database RPCs enforce them again.

export async function reviewListing(fd: FormData): Promise<ActionResult> {
  await requireStaff(["moderator"]);
  const parsed = z.object({ id, decision: z.enum(["approve", "reject"]), reason: note }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id: pid, decision, reason } = parsed.data;
  if (decision === "reject" && !reason) return { ok: false, error: "กรุณาระบุเหตุผลที่ไม่อนุมัติ (ผู้ลงประกาศจะเห็นข้อความนี้)" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_listing", { p_property_id: pid, p_approve: decision === "approve", p_reason: reason ?? null });
  if (error) return dbError(error);
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${pid}`);
  return { ok: true, message: decision === "approve" ? "อนุมัติและเผยแพร่แล้ว" : "ส่งกลับให้ผู้ลงประกาศแก้ไขแล้ว" };
}

export async function takedownListing(fd: FormData): Promise<ActionResult> {
  await requireStaff(["moderator"]);
  const parsed = z.object({ id, reason: z.string().trim().min(3, "กรุณาระบุเหตุผล").max(2000) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_takedown_listing", { p_property_id: parsed.data.id, p_reason: parsed.data.reason });
  if (error) return dbError(error);
  revalidatePath(`/admin/listings/${parsed.data.id}`);
  return { ok: true, message: "ระงับประกาศแล้ว" };
}

export async function featureListing(fd: FormData): Promise<ActionResult> {
  await requireStaff(["moderator"]);
  const parsed = z.object({ id, days: z.coerce.number().int().min(0).max(365) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const until = parsed.data.days === 0 ? null : new Date(Date.now() + parsed.data.days * 86_400_000).toISOString();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_feature_listing", { p_property_id: parsed.data.id, p_until: until });
  if (error) return dbError(error);
  revalidatePath(`/admin/listings/${parsed.data.id}`);
  return { ok: true, message: until ? `ตั้งเป็นทรัพย์แนะนำ ${parsed.data.days} วัน` : "ยกเลิกทรัพย์แนะนำแล้ว" };
}

export async function reviewVerification(fd: FormData): Promise<ActionResult> {
  await requireStaff(["verifier"]);
  const parsed = z.object({ id, decision: z.enum(["approved", "rejected", "needs_info"]), note }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.decision !== "approved" && !parsed.data.note) return { ok: false, error: "กรุณาระบุเหตุผล/สิ่งที่ต้องการเพิ่ม" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_verification", {
    p_request_id: parsed.data.id, p_decision: parsed.data.decision, p_note: parsed.data.note ?? null,
  });
  if (error) return dbError(error);
  revalidatePath("/admin/verifications");
  return { ok: true, message: "บันทึกผลการตรวจแล้ว" };
}

export async function setUserStatus(fd: FormData): Promise<ActionResult> {
  await requireStaff(["support"]);
  const parsed = z.object({ id, status: z.enum(["active", "suspended", "banned"]), reason: note }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.status !== "active" && !parsed.data.reason) return { ok: false, error: "กรุณาระบุเหตุผล" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_status", {
    p_user_id: parsed.data.id, p_status: parsed.data.status, p_reason: parsed.data.reason ?? null,
  });
  if (error) return dbError(error);
  revalidatePath(`/admin/users/${parsed.data.id}`);
  return { ok: true, message: "อัปเดตสถานะบัญชีแล้ว" };
}

export async function resolveReport(fd: FormData): Promise<ActionResult> {
  await requireStaff(["moderator", "support"]);
  const parsed = z.object({ id, status: z.enum(["investigating", "resolved", "dismissed"]), note }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_report", { p_report_id: parsed.data.id, p_status: parsed.data.status, p_note: parsed.data.note ?? null });
  if (error) return dbError(error);
  revalidatePath("/admin/reports");
  return { ok: true, message: "อัปเดตรายงานแล้ว" };
}

export async function reviewPod(fd: FormData): Promise<ActionResult> {
  await requireStaff(["verifier"]);
  const parsed = z.object({
    id, status: z.enum(["pending", "verified", "suspended"]), trust_score: z.coerce.number().int().min(0).max(100).optional(), note,
  }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_pod", {
    p_pod_id: parsed.data.id, p_status: parsed.data.status, p_trust_score: parsed.data.trust_score ?? null, p_note: parsed.data.note ?? null,
  });
  if (error) return dbError(error);
  revalidatePath("/admin/pods");
  return { ok: true, message: "บันทึกแล้ว" };
}

export async function decidePartner(fd: FormData): Promise<ActionResult> {
  await requireStaff(["moderator"]);
  const parsed = z.object({ id, status: z.enum(["approved", "rejected", "revoked"]) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  // Audit + agent notification happen in the commission_access_after_update trigger.
  const { error } = await supabase.from("commission_access_requests").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return dbError(error);
  revalidatePath("/admin/commission");
  return { ok: true };
}

export async function processDeletion(fd: FormData): Promise<ActionResult> {
  await requireStaff(["support"]);
  const parsed = z.object({ id }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: userId, error } = await supabase.rpc("admin_process_deletion", { p_request_id: parsed.data.id });
  if (error) return dbError(error);

  // Remove files and the login itself (needs the service-role key).
  let note = "ลบข้อมูลส่วนบุคคลแล้ว";
  try {
    const admin = createServiceClient();
    for (const bucket of ["avatars", "verification-docs", "chat-attachments"]) {
      const { data: files } = await admin.storage.from(bucket).list(userId as string, { limit: 1000 });
      if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
    }
    await admin.from("verification_documents").delete().in(
      "request_id",
      ((await admin.from("verification_requests").select("id").eq("user_id", userId)).data ?? []).map((r) => r.id),
    );
    const { error: authErr } = await admin.auth.admin.deleteUser(userId as string, true);
    if (authErr) throw authErr;
    note += " และปิดบัญชีเข้าสู่ระบบแล้ว";
  } catch (e) {
    console.error("[processDeletion]", e);
    note += " — ยังไม่ได้ลบไฟล์/บัญชีเข้าสู่ระบบ (ตั้งค่า SUPABASE_SECRET_KEY แล้วลบใน Supabase Dashboard)";
  }
  revalidatePath("/admin/deletions");
  return { ok: true, message: note };
}

const hubSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{3,60}$/, "slug ใช้ a-z 0-9 และ - เท่านั้น"),
  name: z.string().trim().min(3).max(120),
  description: note,
  zone_id: z.uuid().optional(),
  starts_at: z.string().min(10, "ระบุวันเริ่ม"),
  ends_at: z.string().min(10, "ระบุวันสิ้นสุด"),
  status: z.enum(["draft", "scheduled", "live", "ended"]),
});

export async function createHub(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["moderator"]);
  const parsed = hubSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data: hub, error } = await supabase.from("hubs").insert({
    ...v, starts_at: new Date(`${v.starts_at}T00:00:00+07:00`).toISOString(),
    ends_at: new Date(`${v.ends_at}T23:59:59+07:00`).toISOString(), created_by: viewer.id,
  }).select("id").single();
  if (error) return dbError(error);
  if (v.zone_id) {
    const { data: props } = await supabase.from("properties").select("id").eq("zone_id", v.zone_id).eq("status", "active");
    if (props?.length) await supabase.from("hub_properties").insert(props.map((p) => ({ hub_id: hub.id, property_id: p.id })));
  }
  revalidatePath("/admin/content");
  return { ok: true, message: "สร้าง Hub แล้ว" };
}

export async function setHubStatus(fd: FormData): Promise<ActionResult> {
  await requireStaff(["moderator"]);
  const parsed = z.object({ id, status: z.enum(["draft", "scheduled", "live", "ended"]) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("hubs").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return dbError(error);
  revalidatePath("/admin/content");
  return { ok: true };
}

export async function toggleZone(fd: FormData): Promise<ActionResult> {
  await requireStaff(["moderator"]);
  const parsed = z.object({ id, active: z.enum(["true", "false"]) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("zones").update({ active: parsed.data.active === "true" }).eq("id", parsed.data.id);
  if (error) return dbError(error);
  revalidatePath("/admin/content");
  return { ok: true };
}

export async function setStaff(fd: FormData): Promise<ActionResult> {
  await requireStaff(["super_admin"]);
  const parsed = z.object({
    email: z.email("อีเมลไม่ถูกต้อง").optional(),
    user_id: z.uuid().optional(),
    role: z.enum(["super_admin", "moderator", "verifier", "support", "finance"]),
    active: z.enum(["true", "false"]).default("true"),
  }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  let userId = parsed.data.user_id;
  if (!userId && parsed.data.email) {
    const { data } = await supabase.from("profile_private").select("user_id").ilike("email", parsed.data.email).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) return { ok: false, error: "ไม่พบผู้ใช้ — ให้ผู้ใช้สมัครสมาชิกก่อน" };
  const { error } = await supabase.rpc("admin_set_staff", { p_user_id: userId, p_role: parsed.data.role, p_active: parsed.data.active === "true" });
  if (error) return dbError(error);
  revalidatePath("/admin/staff");
  return { ok: true, message: "บันทึกสิทธิ์ทีมงานแล้ว" };
}
