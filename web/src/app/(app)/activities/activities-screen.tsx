"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Clock4, House, MessageCircle, Rocket, Users, Video } from "lucide-react";
import { toggleActivityRegistration } from "@/app/(site)/hubs/actions";

const TABS = [
  { id: "today", label: "วันนี้ (Today)" },
  { id: "tomorrow", label: "พรุ่งนี้" },
  { id: "upcoming", label: "เร็วๆ นี้" },
] as const;
const ICON = { live_tour: Video, open_house: House, live_qa: MessageCircle, workshop: Rocket, consultation: Users };

export type ActivityItem = {
  id: string;
  type: keyof typeof ICON;
  title: string;
  description: string | null;
  time: string;
  day: "today" | "tomorrow" | "upcoming";
  dateLabel: string;
  host: string | null;
  location: string | null;
  seatsLeft: number | null;
  registered: boolean;
};

/** Events schedule (design: `qx`, screen "activities"). */
export function ActivitiesScreen({ items, signedIn }: { items: ActivityItem[]; signedIn: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<ActivityItem["day"]>(items.some((a) => a.day === "today") ? "today" : items.some((a) => a.day === "tomorrow") ? "tomorrow" : "upcoming");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const list = items.filter((a) => a.day === tab);

  const toggle = (a: ActivityItem) => {
    if (!signedIn) return router.push("/login?next=/activities");
    startTransition(async () => {
      setError(null);
      const r = await toggleActivityRegistration(a.id, !a.registered);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  };

  return (
    <div className="min-h-dvh pb-24 bg-[var(--bg)]">
      <div className="px-4 pt-4 pb-2">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]">
          {TABS.map((t) => (
            <button
              type="button"
              onClick={() => setTab(t.id)}
              className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all truncate min-w-0 ${tab === t.id ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              key={t.id}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mx-4 mt-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">{error}</p>}
      <div className="px-4 mt-3 flex flex-col gap-3.5">
        {list.map((f) => {
          const Icon = ICON[f.type] ?? Rocket;
          return (
            <div className="rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-md" key={f.id}>
              <div className="p-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 text-[var(--accent)]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] flex items-center gap-1">
                        <Clock4 className="w-3 h-3 text-[var(--accent)]" />
                        {f.day === "upcoming" ? `${f.dateLabel} ` : ""}
                        {f.time} น.
                      </span>
                      {f.registered && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30">
                          <CheckCircle2 className="w-3 h-3" />
                          ลงทะเบียนแล้ว
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)] mt-1.5 leading-snug">{f.title}</h3>
                    {f.description && <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{f.description}</p>}
                    {f.host && (
                      <div className="mt-2 text-xs text-[var(--text-secondary)]">
                        ผู้ดำเนินรายการ: <span className="text-[var(--text-primary)] font-semibold">{f.host}</span>
                      </div>
                    )}
                    {f.location && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">สถานที่: {f.location}</p>}
                    {f.seatsLeft !== null && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">เหลือที่นั่งว่าง {f.seatsLeft} ที่นั่ง</p>}
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <button
                  type="button"
                  disabled={pending || (!f.registered && f.seatsLeft === 0)}
                  onClick={() => toggle(f)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${f.registered ? "border border-[var(--border)] text-[var(--text-secondary)] hover:border-red-500/50 hover:text-red-400" : "bg-[var(--accent)] text-[var(--bg)] shadow-md shadow-[var(--accent)]/20 hover:opacity-90"}`}
                >
                  {f.registered ? "ยกเลิกการเข้าร่วม" : f.seatsLeft === 0 ? "ที่นั่งเต็มแล้ว" : "ลงชื่อ / สำรองที่นั่ง"}
                </button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="text-center py-16 px-4 bg-[var(--surface)] rounded-3xl border border-[var(--border)]">
            <Calendar className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-40" />
            <p className="font-bold text-base text-[var(--text-primary)]">ไม่มีกิจกรรมในช่วงนี้</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">เลือกดูวันอื่นเพื่อตรวจสอบตารางกิจกรรมและไลฟ์พาชม</p>
          </div>
        )}
      </div>
    </div>
  );
}
