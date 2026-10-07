"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid } from "@/lib/action-utils";
import { CONSENT_VERSION } from "@/lib/constants";
import type { ActionResult, AppRole } from "@/lib/types";

const ROLES = ["buyer", "tenant", "owner", "investor", "agent"] as const;

const schema = z.object({
  display_name: z.string().trim().min(2, "กรอกชื่ออย่างน้อย 2 ตัวอักษร").max(80),
  primary_role: z.enum(ROLES, "เลือกบทบาทหลัก"),
  roles: z.array(z.enum(ROLES)).default([]),
  phone: z.string().trim().regex(/^[0-9+\- ]{9,20}$/, "เบอร์โทรไม่ถูกต้อง").optional(),
  line_id: z.string().trim().max(50).optional(),
  accept_terms: z.literal("on", "กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว"),
  marketing: z.literal("on").optional(),
  next: z.string().optional(),
});

export async function completeOnboarding(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/welcome");
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();

  const roles = Array.from(new Set<AppRole>([v.primary_role, ...v.roles]));
  const steps = await Promise.all([
    supabase.from("profiles").update({
      display_name: v.display_name, primary_role: v.primary_role, onboarded_at: new Date().toISOString(),
    }).eq("id", viewer.id),
    supabase.from("user_roles").upsert(roles.map((role) => ({ user_id: viewer.id, role })), { ignoreDuplicates: true }),
    supabase.from("profile_private").update({ phone: v.phone ?? null, line_id: v.line_id ?? null }).eq("user_id", viewer.id),
    supabase.from("consents").insert([
      { user_id: viewer.id, kind: "terms", version: CONSENT_VERSION, granted: true },
      { user_id: viewer.id, kind: "privacy", version: CONSENT_VERSION, granted: true },
      { user_id: viewer.id, kind: "marketing", version: CONSENT_VERSION, granted: v.marketing === "on" },
    ]),
  ]);
  const failed = steps.find((s) => s.error);
  if (failed) return dbError(failed.error);

  const next = v.next?.startsWith("/") && !v.next.startsWith("//") ? v.next : null;
  redirect(next ?? (v.primary_role === "owner" || v.primary_role === "agent" ? "/dashboard" : "/"));
}
