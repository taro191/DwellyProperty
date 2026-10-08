import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { listConversations } from "@/server/services/chat";
import { coverUrls } from "@/server/services/listings";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "ข้อความ" };

/** Inbox (design: `Ux` list, screen "messages"). */
export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const viewer = await requireViewer("/messages");
  const sp = await searchParams;
  const items = await listConversations(viewer);
  const covers = await coverUrls(items.map((c) => c.property_id).filter((x): x is string => Boolean(x)));

  return (
    <div className="min-h-screen min-h-[100dvh] pb-[calc(5rem+env(safe-area-inset-bottom,0px))] bg-[var(--bg)]">
      <div className="px-4 pt-4 flex flex-col gap-3">
        {sp.error && <p className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">เริ่มแชทไม่สำเร็จ ประกาศอาจปิดไปแล้ว</p>}
        {items.map((h) => {
          const img = h.property_id ? covers.get(h.property_id) : null;
          return (
            <Link
              href={`/messages/${h.id}`}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl text-left bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-all shadow-sm"
              key={h.id}
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 border border-[var(--border)]" />
              ) : (
                <div className="w-14 h-14 rounded-2xl flex-shrink-0 border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center text-xl">💬</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{h.property_title ?? h.other_name ?? "การสนทนา"}</h4>
                  <span className="text-[10px] text-[var(--text-secondary)] flex-shrink-0 ml-2">{h.last_message_at ? timeAgo(h.last_message_at) : ""}</span>
                </div>
                <p className="text-xs text-[var(--accent)] font-semibold mt-0.5 truncate">{h.other_name ?? "ผู้ใช้"}</p>
                <p className={`text-xs mt-0.5 truncate ${h.unread_count > 0 ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-secondary)]"}`}>
                  {h.last_message_preview ?? "เริ่มการสนทนา"}
                </p>
              </div>
              {h.unread_count > 0 && (
                <div className="min-w-5 h-5 px-1 rounded-full bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center text-[10px] font-black flex-shrink-0">{h.unread_count}</div>
              )}
            </Link>
          );
        })}
        {items.length === 0 && (
          <div className="text-center py-20 px-4 bg-[var(--surface)] rounded-3xl border border-[var(--border)]">
            <p className="text-3xl mb-3">💬</p>
            <p className="font-bold text-base text-[var(--text-primary)]">ยังไม่มีข้อความ</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">เมื่อคุณส่งคำถามหรือแชทกับผู้ขาย ข้อความจะปรากฏที่นี่</p>
          </div>
        )}
      </div>
    </div>
  );
}
