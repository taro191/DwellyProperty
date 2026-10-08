"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { markRead, sendMessage } from "@/app/(site)/messages/actions";
import type { Message } from "@/lib/types";

const timeFmt = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const dayFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });

/** Quick questions above the composer (design: Ux). */
const QUICK = [
  { label: "ขอดูโฉนด/แปลน", text: "รบกวนขอตรวจสอบโฉนดที่ดินและแปลนห้องเพื่อความมั่นใจครับ" },
  { label: "สอบถามค่าส่วนกลาง", text: "ส่วนกลางคิดอย่างไรและมีค่าใช้จ่ายแรกเข้าอะไรบ้างครับ" },
  { label: "นัดหมายดูห้องจริง", text: "สะดวกนัดดูห้องจริงช่วงเสาร์-อาทิตย์นี้ไหมครับ" },
  { label: "ขอต่อรองราคาพิเศษ", text: "สนใจห้องนี้ มีโปรโมชั่นลดราคาพิเศษไหมครับ" },
];

/** Chat thread (design: `Ux` conversation view), live via Server-Sent Events. */
export function ChatScreen({
  conversationId, viewerId, initial, property, other,
}: {
  conversationId: string;
  viewerId: string;
  initial: Message[];
  property: { code: string; title: string; image: string | null } | null;
  other: { name: string; avatar: string | null; verified: boolean };
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  // EventSource reconnects automatically; `since` lets the server replay anything missed while disconnected.
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
    <div className="h-screen h-[100dvh] flex flex-col bg-[var(--bg)]">
      <div className="flex items-center gap-3 px-4 min-h-14 pt-[env(safe-area-inset-top,0px)] py-3 bg-[var(--surface)] border-b border-[var(--border)] z-10">
        <button type="button" onClick={() => router.push("/messages")} className="p-1 -ml-1 text-[var(--text-secondary)] hover:text-white cursor-pointer" aria-label="กลับ">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {property?.image || other.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(property?.image ?? other.avatar)!} alt="" className="w-10 h-10 rounded-xl object-cover border border-[var(--border)]" />
        ) : (
          <div className="w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center font-black text-[var(--accent)]">{other.name.charAt(0)}</div>
        )}
        <div className="flex-1 min-w-0">
          {property ? (
            <Link href={`/property/${property.code}`} className="block font-bold text-sm text-[var(--text-primary)] truncate hover:text-[var(--accent)]">
              {property.title}
            </Link>
          ) : (
            <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">{other.name}</h3>
          )}
          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 truncate">
            <span className="truncate">{other.name}</span>
            {other.verified && (
              <>
                <span>•</span>
                <span className="text-[var(--success)] flex items-center gap-0.5 font-medium shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-[var(--surface-2)]/60 border-b border-[var(--border)] no-scrollbar">
        {QUICK.map((q) => (
          <button
            type="button"
            onClick={() => setText(q.text)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
            key={q.label}
          >
            {q.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && <p className="py-10 text-center text-xs text-[var(--text-secondary)]">เริ่มทักทายผู้ขายได้เลย 👋</p>}
        {messages.map((m, i) => {
          const mine = m.sender_id === viewerId;
          const day = dayFmt.format(new Date(m.created_at));
          const showDay = i === 0 || day !== dayFmt.format(new Date(messages[i - 1].created_at));
          return (
            <div key={m.id} className="flex flex-col gap-3">
              {showDay && (
                <div className="text-center my-2">
                  <span className="inline-block text-[11px] px-3.5 py-1.5 rounded-full bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">{day}</span>
                </div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${mine ? "bg-[var(--accent)] text-[var(--bg)] font-medium rounded-br-none" : "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-bl-none"}`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[9px] mt-1 text-right font-medium ${mine ? "text-black/60" : "text-[var(--text-secondary)]"}`}>{timeFmt.format(new Date(m.created_at))}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <div className="p-3 bg-[var(--surface)] border-t border-[var(--border)] pb-safe">
        {error && <p className="mb-2 text-center text-xs text-rose-300">{error}</p>}
        <form onSubmit={send} className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4000}
            placeholder="พิมพ์ข้อความติดต่อผู้ขาย..."
            aria-label="ข้อความ"
            className="flex-1 px-4 py-3 rounded-2xl bg-[var(--surface-2)] text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none border border-[var(--border)] focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="ส่ง"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${text.trim() ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] opacity-60"}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
