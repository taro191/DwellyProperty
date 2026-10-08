import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { listNotifications } from "@/server/services/notifications";
import { timeAgo } from "@/lib/format";
import { NotificationsScreen } from "./notifications-screen";

export const metadata: Metadata = { title: "การแจ้งเตือน" };

export default async function NotificationsPage() {
  const viewer = await requireViewer("/notifications");
  const items = await listNotifications(viewer);
  return (
    <NotificationsScreen
      items={items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, read: Boolean(n.read_at), time: timeAgo(n.created_at) }))}
    />
  );
}
