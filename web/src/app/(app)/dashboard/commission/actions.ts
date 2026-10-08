"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { attempt } from "@/lib/action-utils";
import { requestListingAccess } from "@/server/services/trust";
import type { ActionResult } from "@/lib/types";

export async function askListingAccess(propertyId: string, message?: string): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/commission");
  if (!z.uuid().safeParse(propertyId).success) return { ok: false, error: "invalid" };
  const r = await attempt(() => requestListingAccess(viewer, propertyId, message), "ส่งคำขอสิทธิ์ Co-Agent ให้เจ้าของทรัพย์แล้ว");
  revalidatePath("/dashboard/commission");
  return r;
}
