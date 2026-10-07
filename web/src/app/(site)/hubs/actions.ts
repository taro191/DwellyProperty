"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";

export async function toggleActivityRegistration(activityId: string, register: boolean): Promise<ActionResult> {
  const viewer = await requireViewer("/hubs");
  if (!z.uuid().safeParse(activityId).success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = register
    ? await supabase.from("activity_registrations").insert({ activity_id: activityId, user_id: viewer.id })
    : await supabase.from("activity_registrations").delete().eq("activity_id", activityId).eq("user_id", viewer.id);
  if (error) return dbError(error);
  revalidatePath("/hubs");
  return { ok: true };
}
