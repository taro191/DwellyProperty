import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Card, cn } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import type { ConversationSummary } from "@/lib/types";

export function ConversationList({ items, activeId }: { items: ConversationSummary[]; activeId?: string }) {
  return (
    <Card className="divide-y divide-line overflow-hidden">
      {items.map((c) => (
        <Link key={c.id} href={`/messages/${c.id}`} className={cn("flex gap-3 px-4 py-3.5 hover:bg-surface-2", activeId === c.id && "bg-surface-2")}>
          <Avatar name={c.other_name ?? "?"} src={c.other_avatar} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-2">
              <p className={cn("truncate text-sm", Number(c.unread_count) > 0 ? "font-bold" : "font-semibold")}>{c.other_name}</p>
              <span className="shrink-0 text-xs text-subtle">{timeAgo(c.last_message_at)}</span>
            </div>
            {c.property_title && <p className="truncate text-xs text-accent">{c.property_title}</p>}
            <p className={cn("truncate text-sm", Number(c.unread_count) > 0 ? "text-fg" : "text-subtle")}>{c.last_message_preview ?? "เริ่มการสนทนา"}</p>
          </div>
          {Number(c.unread_count) > 0 && (
            <span className="self-center rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-[#04130d]">{c.unread_count}</span>
          )}
        </Link>
      ))}
    </Card>
  );
}
