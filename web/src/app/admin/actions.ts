"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { attempt, fail, formObject, invalid } from "@/lib/action-utils";
import * as listings from "@/server/services/listings";
import * as trust from "@/server/services/trust";
import * as admin from "@/server/services/admin";
import * as accounts from "@/server/services/accounts";
import { removeFiles, removeUserFolder } from "@/server/storage";
import type { ActionResult } from "@/lib/types";

const id = z.uuid();
const note = z.string().trim().max(2000).optional();

// Role checks here give fast feedback; services enforce them again.

export async function reviewListing(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["moderator"]);
  const parsed = z.object({ id, decision: z.enum(["approve", "reject"]), reason: note }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id: pid, decision, reason } = parsed.data;
  if (decision === "reject" && !reason) return { ok: false, error: "กรุณาระบุเหตุผลที่ไม่อนุมัติ (ผู้ลงประกาศจะเห็นข้อความนี้)" };
  const r = await attempt(() => listings.reviewListing(viewer, pid, decision === "approve", reason),
    decision === "approve" ? "อนุมัติและเผยแพร่แล้ว" : "ส่งกลับให้ผู้ลงประกาศแก้ไขแล้ว");
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${pid}`);
  return r;
}

export async function takedownListing(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["moderator"]);
  const parsed = z.object({ id, reason: z.string().trim().min(3, "กรุณาระบุเหตุผล").max(2000) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => listings.takedownListing(viewer, parsed.data.id, parsed.data.reason), "ระงับประกาศแล้ว");
  revalidatePath(`/admin/listings/${parsed.data.id}`);
  return r;
}

export async function featureListing(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["moderator"]);
  const parsed = z.object({ id, days: z.coerce.number().int().min(0).max(365) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const until = parsed.data.days === 0 ? null : new Date(Date.now() + parsed.data.days * 86_400_000).toISOString();
  const r = await attempt(() => listings.featureListing(viewer, parsed.data.id, until),
    until ? `ตั้งเป็นทรัพย์แนะนำ ${parsed.data.days} วัน` : "ยกเลิกทรัพย์แนะนำแล้ว");
  revalidatePath(`/admin/listings/${parsed.data.id}`);
  return r;
}

export async function reviewVerification(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["verifier"]);
  const parsed = z.object({ id, decision: z.enum(["approved", "rejected", "needs_info"]), note }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => trust.reviewVerification(viewer, parsed.data.id, parsed.data.decision, parsed.data.note), "บันทึกผลการตรวจแล้ว");
  revalidatePath("/admin/verifications");
  return r;
}

export async function setUserStatus(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["support"]);
  const parsed = z.object({ id, status: z.enum(["active", "suspended", "banned"]), reason: note }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => admin.setUserStatus(viewer, parsed.data.id, parsed.data.status, parsed.data.reason), "อัปเดตสถานะบัญชีแล้ว");
  revalidatePath(`/admin/users/${parsed.data.id}`);
  return r;
}

export async function resolveReport(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["moderator", "support"]);
  const parsed = z.object({ id, status: z.enum(["investigating", "resolved", "dismissed"]), note }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => admin.resolveReport(viewer, parsed.data.id, parsed.data.status, parsed.data.note), "อัปเดตรายงานแล้ว");
  revalidatePath("/admin/reports");
  return r;
}

export async function reviewPod(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["verifier"]);
  const parsed = z.object({
    id, status: z.enum(["pending", "verified", "suspended"]), trust_score: z.coerce.number().int().min(0).max(100).optional(), note,
  }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const r = await attempt(() => trust.reviewPod(viewer, v.id, v.status, v.trust_score, v.note), "บันทึกแล้ว");
  revalidatePath("/admin/pods");
  return r;
}

export async function decidePartner(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["moderator"]);
  const parsed = z.object({ id, status: z.enum(["approved", "rejected", "revoked"]) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => trust.decideCommissionAccess(viewer, parsed.data.id, parsed.data.status));
  revalidatePath("/admin/commission");
  return r;
}

export async function processDeletion(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["support"]);
  const parsed = z.object({ id }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { userId, docPaths } = await admin.processDeletion(viewer, parsed.data.id);
    await removeFiles("verification-docs", docPaths);
    for (const bucket of ["avatars", "verification-docs", "chat-attachments"] as const) await removeUserFolder(bucket, userId);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/deletions");
  return { ok: true, message: "ลบข้อมูลส่วนบุคคลและปิดการเข้าสู่ระบบแล้ว" };
}

const hubSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]{3,60}$/, "slug ใช้ a-z 0-9 และ - เท่านั้น"),
  name: z.string().trim().min(3).max(120),
  description: note,
  zone_id: z.uuid().optional(),
  starts_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ระบุวันเริ่ม"),
  ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ระบุวันสิ้นสุด"),
  status: z.enum(["draft", "scheduled", "live", "ended"]),
});

export async function createHub(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["moderator"]);
  const parsed = hubSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const r = await attempt(() => admin.createHub(viewer, {
    ...v,
    starts_at: new Date(`${v.starts_at}T00:00:00+07:00`).toISOString(),
    ends_at: new Date(`${v.ends_at}T23:59:59+07:00`).toISOString(),
  }), "สร้าง Hub แล้ว");
  revalidatePath("/admin/content");
  return r;
}

export async function setHubStatus(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["moderator"]);
  const parsed = z.object({ id, status: z.enum(["draft", "scheduled", "live", "ended"]) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => admin.setHubStatus(viewer, parsed.data.id, parsed.data.status));
  revalidatePath("/admin/content");
  return r;
}

export async function toggleZone(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["moderator"]);
  const parsed = z.object({ id, active: z.enum(["true", "false"]) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => admin.setZoneActive(viewer, parsed.data.id, parsed.data.active === "true"));
  revalidatePath("/admin/content");
  return r;
}

export async function setStaff(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["super_admin"]);
  const parsed = z.object({
    email: z.email("อีเมลไม่ถูกต้อง").optional(),
    user_id: z.uuid().optional(),
    role: z.enum(["super_admin", "moderator", "verifier", "support", "finance"]),
    active: z.enum(["true", "false"]).default("true"),
  }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const r = await attempt(() => admin.setStaff(viewer, { ...v, active: v.active === "true" }), "บันทึกสิทธิ์ทีมงานแล้ว");
  revalidatePath("/admin/staff");
  return r;
}

// ---------------------------------------------------------------------------
// User management (super admin)
// ---------------------------------------------------------------------------
const STAFF = ["super_admin", "moderator", "verifier", "support", "finance"] as const;
const staffOrNone = z.enum([...STAFF, "none"]).transform((v) => (v === "none" ? null : v));

export async function createUser(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["super_admin"]);
  const parsed = z.object({
    email: z.email("อีเมลไม่ถูกต้อง"),
    name: z.string().trim().max(80).optional(),
    password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร").max(200).optional(),
    staff_role: staffOrNone.default(null),
    app_roles: z.array(z.enum(["buyer", "tenant", "owner", "investor", "agent"])).default([]),
  }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const r = await attempt(() => accounts.createUserAsAdmin(viewer, {
    email: v.email, name: v.name, password: v.password, staffRole: v.staff_role, appRoles: v.app_roles,
  }), v.password ? "สร้างผู้ใช้แล้ว — ล็อกอินด้วยอีเมลและรหัสผ่านที่ตั้งไว้ได้ทันที" : "สร้างผู้ใช้แล้ว — ผู้ใช้ล็อกอินด้วยรหัส OTP ทางอีเมล");
  revalidatePath("/admin/users");
  revalidatePath("/admin/staff");
  return r;
}

export async function setUserStaffRole(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["super_admin"]);
  const parsed = z.object({ id, staff_role: staffOrNone }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => accounts.setStaffRole(viewer, parsed.data.id, parsed.data.staff_role),
    parsed.data.staff_role ? "บันทึกสิทธิ์ admin แล้ว" : "ถอนสิทธิ์ admin แล้ว");
  revalidatePath(`/admin/users/${parsed.data.id}`);
  revalidatePath("/admin/staff");
  return r;
}

export async function setUserPassword(fd: FormData): Promise<ActionResult> {
  const viewer = await requireStaff(["super_admin"]);
  const parsed = z.object({
    id,
    password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร").max(200),
    confirm: z.string(),
  }).refine((v) => v.password === v.confirm, { message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน", path: ["confirm"] })
    .safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  return attempt(() => accounts.setPasswordAsAdmin(viewer, parsed.data.id, parsed.data.password),
    "ตั้งรหัสผ่านใหม่แล้ว และให้ผู้ใช้ออกจากระบบทุกอุปกรณ์");
}
