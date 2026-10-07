"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { attempt, fail, formObject, invalid } from "@/lib/action-utils";
import * as account from "@/server/services/account";
import * as trust from "@/server/services/trust";
import { markNotificationsRead as markRead } from "@/server/services/notifications";
import { publicFileUrl } from "@/server/storage";
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
  const r = await attempt(() => account.saveProfile(viewer, parsed.data), "บันทึกแล้ว");
  revalidatePath("/me");
  return r;
}

export async function setAvatar(path: string): Promise<ActionResult> {
  const viewer = await requireViewer("/me");
  if (!path.startsWith(`${viewer.id}/avatar/`)) return { ok: false, error: "invalid" };
  const r = await attempt(() => account.setAvatar(viewer, publicFileUrl("avatars", path)));
  revalidatePath("/", "layout");
  return r;
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
  try {
    const id = await trust.createVerificationRequest(viewer, {
      kind, property_id, data: Object.fromEntries(Object.entries(data).filter(([, x]) => x)) as Record<string, string>,
    });
    return { ok: true, data: { id } };
  } catch (e) {
    return fail(e);
  }
}

export async function attachVerificationDoc(requestId: string, docType: string, path: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!z.uuid().safeParse(requestId).success) return { ok: false, error: "invalid" };
  const r = await attempt(() => trust.attachVerificationDoc(viewer, requestId, docType, path));
  revalidatePath("/me/verification");
  return r;
}

export async function resubmitVerification(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/me/verification");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, error: "invalid" };
  const r = await attempt(() => trust.resubmitVerification(viewer, id.data, String(fd.get("note") ?? "")), "ส่งข้อมูลเพิ่มเติมแล้ว");
  revalidatePath("/me/verification");
  return r;
}

// ---------------------------------------------------------------------------
// PDPA
// ---------------------------------------------------------------------------
export async function setMarketingConsent(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/me/privacy");
  const granted = fd.get("granted") === "true";
  const r = await attempt(() => account.setMarketingConsent(viewer, granted), granted ? "เปิดรับข่าวสารแล้ว" : "ยกเลิกการรับข่าวสารแล้ว");
  revalidatePath("/me/privacy");
  return r;
}

export async function requestAccountDeletion(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/me/privacy");
  if (fd.get("confirm") !== "ลบบัญชี") return { ok: false, error: "พิมพ์คำว่า “ลบบัญชี” เพื่อยืนยัน" };
  const reason = String(fd.get("reason") ?? "").slice(0, 1000) || undefined;
  const r = await attempt(() => account.requestDeletion(viewer, reason), "รับคำขอแล้ว ทีมงานจะดำเนินการภายใน 30 วันตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล");
  revalidatePath("/me/privacy");
  return r;
}

export async function cancelAccountDeletion(): Promise<ActionResult> {
  const viewer = await requireViewer("/me/privacy");
  const r = await attempt(() => account.cancelDeletion(viewer), "ยกเลิกคำขอลบบัญชีแล้ว");
  revalidatePath("/me/privacy");
  return r;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function markNotificationsRead(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/notifications");
  const id = fd.get("id");
  const r = await attempt(() => markRead(viewer, typeof id === "string" && z.uuid().safeParse(id).success ? id : undefined));
  revalidatePath("/", "layout");
  return r;
}
