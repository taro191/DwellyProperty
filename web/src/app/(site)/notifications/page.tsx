import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { listNotifications } from "@/server/services/notifications";
import { Card, EmptyState, PageHeader, cn } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { timeAgo } from "@/lib/format";
import { markNotificationsRead } from "../me/actions";

export const metadata: Metadata = { title: "การแจ้งเตือน" };

export default async function NotificationsPage() {
  const viewer = await requireViewer("/notifications");
  const items = await listNotifications(viewer);
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="การแจ้งเตือน"
        subtitle={unread ? `ยังไม่ได้อ่าน ${unread} รายการ` : "อ่านครบแล้ว"}
        actions={unread > 0 && (
          <ActionForm action={markNotificationsRead} showMessage={false}>
            <SubmitButton size="sm" variant="secondary">ทำเครื่องหมายว่าอ่านแล้วทั้งหมด</SubmitButton>
          </ActionForm>
        )}
      />
      {items.length === 0 ? (
        <EmptyState title="ยังไม่มีการแจ้งเตือน" />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {items.map((n) => {
            const body = (
              <div className={cn("flex gap-3 px-4 py-3.5", !n.read_at && "bg-accent/5")}>
                <span className={cn("mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full", n.read_at ? "bg-surface-2 text-subtle" : "bg-accent/15 text-accent")}>
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.body && <p className="line-clamp-2 text-sm text-muted">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-subtle">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            );
            return n.link ? <Link key={n.id} href={n.link} className="block hover:bg-surface-2">{body}</Link> : <div key={n.id}>{body}</div>;
          })}
        </Card>
      )}
    </div>
  );
}
