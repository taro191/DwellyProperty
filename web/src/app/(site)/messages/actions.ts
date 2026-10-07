"use server";

import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { fail } from "@/lib/action-utils";
import { markConversationRead, sendMessage as send } from "@/server/services/chat";
import type { ActionResult, Message } from "@/lib/types";

export async function sendMessage(conversationId: string, body: string): Promise<ActionResult<Message>> {
  const viewer = await requireViewer("/messages");
  if (!z.uuid().safeParse(conversationId).success) return { ok: false, error: "invalid" };
  try {
    return { ok: true, data: await send(viewer, conversationId, body) };
  } catch (e) {
    return fail(e);
  }
}

export async function markRead(conversationId: string): Promise<void> {
  const viewer = await requireViewer("/messages");
  if (z.uuid().safeParse(conversationId).success) await markConversationRead(viewer, conversationId);
}
