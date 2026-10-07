import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { listConversations } from "@/server/services/chat";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { ConversationList } from "./conversation-list";

export const metadata: Metadata = { title: "ข้อความ" };

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const viewer = await requireViewer("/messages");
  const sp = await searchParams;
  const items = await listConversations(viewer);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="ข้อความ (Dwelly Inbox)" />
      {sp.error && <div className="mb-4"><Alert tone="danger">เริ่มแชทไม่สำเร็จ ประกาศอาจปิดไปแล้ว</Alert></div>}
      {items.length === 0 ? (
        <EmptyState title="ยังไม่มีข้อความ" body="กดปุ่ม “แชท” ในหน้าประกาศเพื่อคุยกับผู้ขาย" />
      ) : (
        <ConversationList items={items} />
      )}
    </div>
  );
}
