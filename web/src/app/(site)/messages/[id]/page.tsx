import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { getConversation } from "@/server/services/chat";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui";
import { ChatThread } from "./chat-thread";

export const metadata: Metadata = { title: "แชท" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/messages/${id}`);
  const conv = await getConversation(viewer, id); // also marks the thread read
  if (!conv) notFound();

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] max-w-2xl flex-col md:h-[calc(100dvh-9rem)]">
      <Card className="flex items-center gap-3 rounded-b-none px-4 py-3">
        <Link href="/messages" className="text-subtle hover:text-fg" aria-label="กลับ"><ArrowLeft className="h-5 w-5" /></Link>
        <Avatar name={conv.other?.display_name ?? "?"} src={conv.other?.avatar_url} size={36} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{conv.other?.display_name ?? "ผู้ใช้"}</p>
          {conv.property_code && <Link href={`/property/${conv.property_code}`} className="block truncate text-xs text-accent">{conv.property_title}</Link>}
        </div>
      </Card>
      <ChatThread conversationId={id} viewerId={viewer.id} initial={conv.messages} />
    </div>
  );
}
