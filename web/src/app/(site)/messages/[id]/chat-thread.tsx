"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { markRead, sendMessage } from "../actions";
import { cn } from "@/components/ui";
import type { Message } from "@/lib/types";

const timeFmt = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const dayFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });

export function ChatThread({ conversationId, viewerId, initial }: { conversationId: string; viewerId: string; initial: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  // Live updates via Server-Sent Events; EventSource reconnects automatically and
  // `since` lets the server replay anything missed while disconnected.
  const lastSeen = useRef(initial.at(-1)?.created_at ?? new Date().toISOString());
  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      es = new EventSource(`/api/chat/${conversationId}/stream?since=${encodeURIComponent(lastSeen.current)}`);
      es.addEventListener("message", (ev) => {
        const m = JSON.parse((ev as MessageEvent<string>).data) as Message;
        if (m.created_at > lastSeen.current) lastSeen.current = m.created_at;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.sender_id !== viewerId) void markRead(conversationId);
      });
      es.onerror = () => {
        es?.close();
        retry = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      clearTimeout(retry);
      es?.close();
    };
  }, [conversationId, viewerId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const res = await sendMessage(conversationId, body);
    setSending(false);
    if (!res.ok || !res.data) return setError(res.ok ? "ส่งข้อความไม่สำเร็จ" : res.error);
    const m = res.data;
    setText("");
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto border-x border-line bg-surface/40 px-4 py-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-subtle">เริ่มทักทายผู้ขายได้เลย 👋</p>}
        {messages.map((m, i) => {
          const mine = m.sender_id === viewerId;
          const day = dayFmt.format(new Date(m.created_at));
          const showDay = i === 0 || day !== dayFmt.format(new Date(messages[i - 1].created_at));
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-[11px] text-subtle">{day}</p>}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[78%] rounded-3xl px-4 py-2 text-sm", mine ? "rounded-br-md bg-accent text-[#04130d]" : "rounded-bl-md bg-surface-2")}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("mt-0.5 text-right text-[10px]", mine ? "text-[#04130d]/70" : "text-subtle")}>{timeFmt.format(new Date(m.created_at))}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex items-end gap-2 rounded-b-3xl border border-line bg-surface p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(e);
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder="พิมพ์ข้อความ…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
          aria-label="ข้อความ"
        />
        <button disabled={sending || !text.trim()} className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-[#04130d] disabled:opacity-40" aria-label="ส่ง">
          <SendHorizontal className="h-5 w-5" />
        </button>
      </form>
      {error && <p className="mt-1 text-center text-xs text-red-300">{error}</p>}
    </>
  );
}
