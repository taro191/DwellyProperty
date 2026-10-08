import type { Metadata } from "next";
import { CheckCircle2, Gift, Sparkles, Ticket } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { passProgress } from "@/server/services/account";
import { liveHub } from "@/server/services/content";
import { ROLE_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Your Dwelly Pass" };

/** Dwelly Pass (design: `Hx`, screen "pass"): journey and stamps from the member's real activity. */
export default async function PassPage() {
  const viewer = await requireViewer("/pass");
  const [p, hub] = await Promise.all([passProgress(viewer), liveHub()]);
  const journey = [
    { label: "เข้าร่วม Dwelly (Joined Dwelly)", done: true },
    { label: "ตั้งค่าบัญชีและบทบาท (Preferences Completed)", done: p.onboarded },
    { label: "สำรวจอสังหาฯ 3 รายการขึ้นไป (Explored Listings)", done: p.views >= 3 },
    { label: "บันทึกอสังหาฯ ที่สนใจ (Saved Properties)", done: p.saved >= 1 },
    { label: "บันทึกไว้เปรียบเทียบ 3 แห่ง (Compared Properties)", done: p.saved >= 3 },
    { label: "พูดคุยกับผู้ขาย (Talked to Seller)", done: p.chats >= 1 },
    { label: "นัดหมายดูห้องจริง (Booked Appointment)", done: p.appointments >= 1 },
    { label: "ยื่นข้อเสนอราคา (Made an Offer)", done: p.offers >= 1 },
  ];
  const stamps = [
    { icon: "🎪", label: "Dwelly Joined", earned: true },
    { icon: "🎯", label: "Preferences Done", earned: p.onboarded },
    { icon: "🗺️", label: "3 Listings Explored", earned: p.views >= 3 },
    { icon: "❤️", label: "Saved 3 Homes", earned: p.saved >= 3 },
    { icon: "🎟️", label: "Event Joined", earned: p.events >= 1 },
    { icon: "💬", label: "First Chat", earned: p.chats >= 1 },
    { icon: "📹", label: "Video Tour", earned: p.videoTours >= 1 },
    { icon: "🏆", label: "Deal Maker", earned: p.offers >= 1 },
  ];
  const pct = Math.round((journey.filter((j) => j.done).length / journey.length) * 100);
  const next = journey.find((j) => !j.done);
  const name = viewer.profile.display_name;

  return (
    <div className="min-h-dvh pb-24 bg-[var(--bg)]">
      <div className="mx-4 mt-4">
        <div className="relative rounded-3xl overflow-hidden p-5 bg-gradient-to-br from-[#0D1A12] via-[#13171C] to-[#0A120E] border-2 border-[var(--accent)]/40 shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[var(--accent)]/15 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-[var(--accent)] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                OFFICIAL DWELLY PASS
              </p>
              <h2 className="font-black text-lg text-[var(--text-primary)] mt-0.5">{hub?.name ?? "Dwelly Thailand"}</h2>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-2xl text-[var(--accent)] shadow-md">
              <Ticket className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-[var(--border)]">
            {viewer.profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewer.profile.avatar_url} alt="" className="w-11 h-11 rounded-2xl object-cover shadow-md" />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center font-black text-lg shadow-md">{name.charAt(0).toUpperCase()}</div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm text-[var(--text-primary)] truncate">{name}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                Member ID: #DW-{viewer.id.slice(0, 6).toUpperCase()} • {ROLE_LABEL[viewer.profile.primary_role]}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "อสังหาฯ ที่บันทึกไว้", value: `${p.saved} รายการ` },
              { label: "นัดหมายดูทรัพย์", value: `${p.appointments} นัด` },
              { label: "กิจกรรมที่เข้าร่วม", value: `${p.events} เซสชัน` },
              { label: "ข้อเสนอที่ยื่น", value: `${p.offers} รายการ` },
            ].map((o) => (
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-sm" key={o.label}>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{o.label}</p>
                <p className="font-black text-sm text-[var(--text-primary)] mt-0.5">{o.value}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs font-bold">
              <span className="text-[var(--text-secondary)]">Journey Completion</span>
              <span className="text-[var(--accent)]">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden border border-[var(--border)]">
              <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 mt-6">
        <h3 className="font-extrabold text-base text-[var(--text-primary)] mb-3">เส้นทางสู่การเป็นเจ้าของ (Journey Progress)</h3>
        <div className="flex flex-col gap-0 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          {journey.map((o, g) => (
            <div className="flex items-start gap-3.5 relative" key={o.label}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 ${o.done ? "bg-[var(--accent)] text-[var(--bg)]" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
                >
                  {o.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : g + 1}
                </div>
                {g < journey.length - 1 && <div className={`w-0.5 h-7 my-0.5 ${o.done ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />}
              </div>
              <div className="pt-0.5 pb-3">
                <p className={`text-xs font-semibold ${o.done ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{o.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-base text-[var(--text-primary)]">สะสมตราประทับ Dwelly (Dwelly Stamps)</h3>
          <span className="text-xs text-[var(--accent)] font-semibold">
            {stamps.filter((o) => o.earned).length} / {stamps.length}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {stamps.map((o) => (
            <div
              className={`p-3 rounded-2xl flex flex-col items-center text-center gap-1.5 border transition-all ${o.earned ? "bg-[var(--surface)] border-[var(--accent)]/40 shadow-sm" : "bg-[var(--surface-2)] border-[var(--border)] opacity-40"}`}
              key={o.label}
            >
              <span className="text-2xl block filter drop-shadow">{o.icon}</span>
              <p className="text-[10px] font-bold leading-tight line-clamp-2 text-[var(--text-primary)]">{o.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-4 mt-6 p-4 rounded-2xl bg-gradient-to-r from-[var(--surface)] to-[#152018] border border-[var(--accent)]/30 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] flex-shrink-0">
          <Gift className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--accent)]">Next Step</p>
          <h4 className="font-bold text-sm text-[var(--text-primary)] mt-0.5">{next ? next.label : "ครบทุกขั้นตอนแล้ว 🎉"}</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">ทำขั้นตอนถัดไปเพื่อสะสมตราประทับ Dwelly</p>
        </div>
      </div>
    </div>
  );
}
