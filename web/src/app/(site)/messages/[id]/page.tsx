import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui";
import type { Message } from "@/lib/types";
import { ChatThread } from "./chat-thread";

export const metadata: Metadata = { title: "แชท" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/messages/${id}`);
  const supabase = await createClient();

  const [{ data: conv }, { data: participants }, { data: messages }] = await Promise.all([
    supabase.from("conversations").select("id, property_id, properties(title, code, status)").eq("id", id).maybeSingle(),
    supabase.from("conversation_participants").select("user_id, profiles(display_name, avatar_url)").eq("conversation_id", id),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }).limit(500),
  ]);
  if (!conv || !participants?.some((p) => p.user_id === viewer.id)) notFound();

  const other = participants.find((p) => p.user_id !== viewer.id);
  const otherProfile = other?.profiles as unknown as { display_name: string; avatar_url: string | null } | null;
  const property = conv.properties as unknown as { title: string; code: string } | null;

  // Opening the thread marks it read (and clears its notification).
  await Promise.all([
    supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", id).eq("user_id", viewer.id),
    supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.id).eq("entity_id", id).is("read_at", null),
  ]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] max-w-2xl flex-col md:h-[calc(100dvh-9rem)]">
      <Card className="flex items-center gap-3 rounded-b-none px-4 py-3">
        <Link href="/messages" className="text-subtle hover:text-fg" aria-label="กลับ"><ArrowLeft className="h-5 w-5" /></Link>
        <Avatar name={otherProfile?.display_name ?? "?"} src={otherProfile?.avatar_url} size={36} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{otherProfile?.display_name ?? "ผู้ใช้"}</p>
          {property && <Link href={`/property/${property.code}`} className="block truncate text-xs text-accent">{property.title}</Link>}
        </div>
      </Card>
      <ChatThread conversationId={id} viewerId={viewer.id} initial={(messages ?? []) as Message[]} />
    </div>
  );
}
