"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { attempt } from "@/lib/action-utils";
import { setRegistration } from "@/server/services/content";
import type { ActionResult } from "@/lib/types";

export async function toggleActivityRegistration(activityId: string, register: boolean): Promise<ActionResult> {
  const viewer = await requireViewer("/hubs");
  if (!z.uuid().safeParse(activityId).success) return { ok: false, error: "invalid" };
  const r = await attempt(() => setRegistration(viewer, activityId, register));
  revalidatePath("/hubs");
  return r;
}
