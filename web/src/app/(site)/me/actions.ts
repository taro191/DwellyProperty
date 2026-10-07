"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid } from "@/lib/action-utils";
import { CONSENT_VERSION } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "ชื่ออย่างน้อย 2 ตัวอักษร").max(80),
  bio: z.string().trim().max(2000).optional(),
  phone: z.string().trim().regex(/^[0-9+\- ]{9,20}$/, "เบอร์โทรไม่ถูกต้อง").optional(),
  line_id: z.string().trim().max(50).optional(),
});

export async function saveProfile(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/me");
  const parsed = profileSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const [a, b] = await Promise.all([
    supabase.from("profiles").update({ display_name: v.display_name, bio: v.bio ?? null }).eq("id", viewer.id),
    supabase.from("profile_private").update({ phone: v.phone ?? null, line_id: v.line_id ?? null }).eq("user_id", viewer.id),
  ]);
  if (a.error || b.error) return dbError(a.error ?? b.error);
  revalidatePath("/me");
  return { ok: true, message: "บันทึกแล้ว" };
}

export async function setAvatar(path: string): Promise<ActionResult> {
  const viewer = await requireViewer("/me");
  if (!path.startsWith(`${viewer.id}/`)) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase.from("profiles").update({ avatar_url: `${data.publicUrl}?v=${Date.now()}` }).eq("id", viewer.id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Verification (KYC, agent licence, property ownership)
// ---------------------------------------------------------------------------
const verificationSchema = z.object({
  kind: z.enum(["identity", "agent_license", "property_ownership", "company"]),
  property_id: z.uuid().optional(),
  full_name: z.string().trim().min(2, "กรอกชื่อ-นามสกุลตามเอกสาร").max(120),
  doc_number_last4: z.string().trim().regex(/^\w{4}$/, "กรอก 4 ตัวท้ายของเลขเอกสาร").optional(),
  license_no: z.string().trim().max(50).optional(),
  deed_no: z.string().trim().max(50).optional(),
});

/** Step 1: create the request; the browser then uploads files and calls attachVerificationDoc. */
export async function createVerificationRequest(fd: FormData): Promise<ActionResult<{ id: string }>> {
  const viewer = await requireViewer("/me/verification");
  const parsed = verificationSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { kind, property_id, ...data } = parsed.data;
  if (kind === "property_ownership" && !property_id) return { ok: false, error: "เลือกประกาศที่ต้องการยืนยัน" };
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("verification_requests")
    .insert({
      user_id: viewer.id, kind, property_id: kind === "property_ownership" ? property_id : null,
      submitted_data: Object.fromEntries(Object.entries(data).filter(([, x]) => x)),
    })
    .select("id")
    .single();
  if (error) return dbError(error);
  return { ok: true, data: { id: row.id } };
}

export async function attachVerificationDoc(requestId: string, docType: string, path: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!z.uuid().safeParse(requestId).success || !path.startsWith(`${viewer.id}/${requestId}/`)) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("verification_documents").insert({ request_id: requestId, doc_type: docType.slice(0, 30), storage_path: path });
  if (error) return dbError(error);
  revalidatePath("/me/verification");
  return { ok: true };
}

export async function resubmitVerification(fd: FormData): Promise<ActionResult> {
  await requireViewer("/me/verification");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, error: "invalid" };
  const note = String(fd.get("note") ?? "").slice(0, 1000);
  const supabase = await createClient();
  const { data: current } = await supabase.from("verification_requests").select("submitted_data").eq("id", id.data).single();
  const { error } = await supabase
    .from("verification_requests")
    .update({ submitted_data: { ...(current?.submitted_data ?? {}), applicant_note: note } })
    .eq("id", id.data);
  if (error) return dbError(error);
  revalidatePath("/me/verification");
  return { ok: true, message: "ส่งข้อมูลเพิ่มเติมแล้ว" };
}

// ---------------------------------------------------------------------------
// PDPA
// ---------------------------------------------------------------------------
export async function setMarketingConsent(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/me/privacy");
  const granted = fd.get("granted") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("consents").insert({
    user_id: viewer.id, kind: "marketing", version: CONSENT_VERSION, granted, user_agent: null,
  });
  if (error) return dbError(error);
  revalidatePath("/me/privacy");
  return { ok: true, message: granted ? "เปิดรับข่าวสารแล้ว" : "ยกเลิกการรับข่าวสารแล้ว" };
}

export async function requestAccountDeletion(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/me/privacy");
  if (fd.get("confirm") !== "ลบบัญชี") return { ok: false, error: "พิมพ์คำว่า “ลบบัญชี” เพื่อยืนยัน" };
  const supabase = await createClient();
  const { error } = await supabase.from("account_deletion_requests").insert({
    user_id: viewer.id, reason: String(fd.get("reason") ?? "").slice(0, 1000) || null,
  });
  if (error) return dbError(error);
  revalidatePath("/me/privacy");
  return { ok: true, message: "รับคำขอแล้ว ทีมงานจะดำเนินการภายใน 30 วันตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล" };
}

export async function cancelAccountDeletion(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/me/privacy");
  const supabase = await createClient();
  const { error } = await supabase.from("account_deletion_requests").update({ status: "cancelled" })
    .eq("user_id", viewer.id).eq("status", "pending");
  if (error) return dbError(error);
  void fd;
  revalidatePath("/me/privacy");
  return { ok: true, message: "ยกเลิกคำขอลบบัญชีแล้ว" };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function markNotificationsRead(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/notifications");
  const id = fd.get("id");
  const supabase = await createClient();
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.id).is("read_at", null);
  if (typeof id === "string" && z.uuid().safeParse(id).success) q = q.eq("id", id);
  const { error } = await q;
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true };
}
