import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getConversation } from "@/server/services/chat";
import { coverUrls } from "@/server/services/listings";
import { ChatScreen } from "./chat-screen";

export const metadata: Metadata = { title: "แชท" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/messages/${id}`);
  const conv = await getConversation(viewer, id); // also marks the thread read
  if (!conv) notFound();
  const cover = conv.property_id ? (await coverUrls([conv.property_id])).get(conv.property_id) ?? null : null;
  return (
    <ChatScreen
      conversationId={id}
      viewerId={viewer.id}
      initial={conv.messages}
      property={conv.property_code ? { code: conv.property_code, title: conv.property_title ?? "", image: cover } : null}
      other={{ name: conv.other?.display_name ?? "ผู้ใช้", avatar: conv.other?.avatar_url ?? null, verified: Boolean(conv.other?.is_kyc_verified) }}
    />
  );
}
