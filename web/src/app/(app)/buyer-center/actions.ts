"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { attempt, formObject, invalid } from "@/lib/action-utils";
import { CATEGORIES } from "@/server/db/schema";
import * as requests from "@/server/services/requests";
import type { ActionResult } from "@/lib/types";

const schema = z.object({
  deal: z.enum(["buy", "rent"]),
  category: z.enum(CATEGORIES),
  province: z.string().trim().min(2, "เลือกจังหวัด").max(80),
  area: z.string().trim().min(2, "ระบุอำเภอ / ทำเล").max(120),
  max_budget: z.coerce.number().positive("ระบุงบประมาณ").max(1e10),
  criteria: z.string().trim().max(1000).optional(),
});

export async function postBuyerRequest(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/buyer-center");
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => requests.createBuyerRequest(viewer, parsed.data), "โพสต์หาทรัพย์แล้ว ระบบจะจับคู่กับประกาศที่ตรงสเปกให้อัตโนมัติ");
  revalidatePath("/buyer-center");
  return r;
}

export async function closeBuyerRequest(id: string): Promise<ActionResult> {
  const viewer = await requireViewer("/buyer-center");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "invalid" };
  const r = await attempt(() => requests.closeBuyerRequest(viewer, id), "ปิดโพสต์แล้ว");
  revalidatePath("/buyer-center");
  return r;
}
