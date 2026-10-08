"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCheck, Database, FilePen, House, MessageSquare, Rocket } from "lucide-react";
import { markNotificationsRead } from "@/app/(site)/me/actions";

/** Icon + tint per notification kind (design: `O1`). */
const KIND = {
  festival: { icon: Rocket, color: "text-[var(--accent)] bg-[var(--accent)]/15" },
  match: { icon: House, color: "text-[var(--success)] bg-[var(--success)]/15" },
  message: { icon: MessageSquare, color: "text-[var(--warning)] bg-[var(--warning)]/15" },
  appointment: { icon: Calendar, color: "text-blue-400 bg-blue-500/15" },
  offer: { icon: FilePen, color: "text-purple-400 bg-purple-500/15" },
  database: { icon: Database, color: "text-emerald-400 bg-emerald-500/15" },
};
const KIND_OF: Record<string, keyof typeof KIND> = {
  listing: "match", listing_expiring: "match", offer: "offer", message: "message", inquiry: "message", appointment: "appointment",
  verification: "database", pod: "database", commission: "database", report: "database", billing: "festival",
};

export type NotificationItem = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; time: string };

/** Notifications (design: `mm`, screen "notifications"). */
export function NotificationsScreen({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const unread = items.filter((n) => !n.read).length;
  const mark = (id?: string, then?: string | null) =>
    startTransition(async () => {
      const fd = new FormData();
      if (id) fd.set("id", id);
      await markNotificationsRead(fd);
      if (then) router.push(then);
      else router.refresh();
    });

  return (
    <div className="min-h-dvh pb-24 bg-[var(--bg)]">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-base text-[var(--text-primary)]">ศูนย์การแจ้งเตือน</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{unread > 0 ? `มี ${unread} รายการที่ยังไม่ได้อ่าน` : "อ่านครบทุกรายการแล้ว"}</p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={() => mark()} className="text-xs font-bold text-[var(--accent)] flex items-center gap-1 hover:underline">
            <CheckCheck className="w-3.5 h-3.5" />
            อ่านทั้งหมด
          </button>
        )}
      </div>
      <div className="flex flex-col mt-2">
        {items.map((n) => {
          const k = KIND[KIND_OF[n.type] ?? "festival"];
          const Icon = k.icon;
          return (
            <button
              type="button"
              onClick={() => (n.read ? n.link && router.push(n.link) : mark(n.id, n.link))}
              className={`flex items-start gap-3.5 px-4 py-4 text-left border-b border-[var(--border)] transition-colors ${n.read ? "bg-transparent" : "bg-[var(--accent)]/5"}`}
              key={n.id}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${k.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[var(--text-primary)] leading-tight">{n.title}</h4>
                  <span className="text-[10px] text-[var(--text-secondary)] flex-shrink-0 ml-2">{n.time}</span>
                </div>
                {n.body && <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{n.body}</p>}
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0" />}
            </button>
          );
        })}
        {items.length === 0 && (
          <div className="mx-4 text-center py-20 px-4 bg-[var(--surface)] rounded-3xl border border-[var(--border)]">
            <p className="text-3xl mb-3">🔔</p>
            <p className="font-bold text-base text-[var(--text-primary)]">ยังไม่มีการแจ้งเตือน</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">การนัดหมาย ข้อเสนอ และข้อความใหม่จะแจ้งเตือนที่นี่</p>
          </div>
        )}
      </div>
    </div>
  );
}
