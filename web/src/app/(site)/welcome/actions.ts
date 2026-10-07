"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { fail, formObject, invalid } from "@/lib/action-utils";
import { completeOnboarding as complete } from "@/server/services/account";
import type { ActionResult } from "@/lib/types";

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
  try {
    await complete(viewer, { ...v, marketing: v.marketing === "on", userAgent: (await headers()).get("user-agent") ?? undefined });
  } catch (e) {
    return fail(e);
  }
  const next = v.next?.startsWith("/") && !v.next.startsWith("//") ? v.next : null;
  redirect(next ?? (v.primary_role === "owner" || v.primary_role === "agent" ? "/dashboard" : "/"));
}
