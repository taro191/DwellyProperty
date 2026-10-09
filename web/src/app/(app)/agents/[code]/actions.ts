"use server";

import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { startConversation } from "@/server/services/chat";
import { publicAgentProfile } from "@/server/services/trust";

/** "ติดต่อ / ฝากขาย": opens a direct chat with the agent. */
export async function chatWithAgent(fd: FormData): Promise<void> {
  const code = String(fd.get("code") ?? "").slice(0, 12);
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=/agents/${encodeURIComponent(code)}`);
  const agent = await publicAgentProfile(code);
  if (!agent) redirect("/messages");
  let id: string;
  try {
    id = await startConversation(viewer, null, agent.agent.user_id);
  } catch {
    redirect(`/agents/${encodeURIComponent(code)}`);
  }
  redirect(`/messages/${id}`);
}
