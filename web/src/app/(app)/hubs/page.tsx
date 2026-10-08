import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building, Calendar, CalendarDays, Clock4, Sparkles, Users } from "lucide-react";
import { hubsOverview, listZones } from "@/server/services/content";

export const metadata: Metadata = { title: "Dwelly Hubs" };

/** "3d 08h 42m" until `iso` (prototype countdown). */
function countdown(iso: string) {
  const ms = Math.max(0, new Date(iso).getTime() - Date.now());
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m` : `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

/** Dwelly Hubs discovery (design: `hx`, screen "discovery"). */
export default async function HubsPage() {
  const [hubs, zones] = await Promise.all([hubsOverview(), listZones()]);
  const zoneName = new Map(zones.map((z) => [z.id, z.name_th]));
  const live = hubs.filter((h) => h.status === "live");
  const upcoming = hubs.filter((h) => h.status === "scheduled");
  const ended = hubs.filter((h) => h.status === "ended");
  const where = (h: (typeof hubs)[number]) => [h.zone_id ? zoneName.get(h.zone_id) : null, h.theme].filter(Boolean).join(" • ") || "Dwelly Thailand";

  return (
    <div className="min-h-dvh pb-24 bg-[var(--bg)]">
      <div className="px-4 pt-6 pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Real Estate Dwelly Hubs
        </p>
        <h1 className="text-2xl font-black text-[var(--text-primary)] leading-tight tracking-tight">Find your next property at the right moment.</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">รวมทุกโครงการอสังหาฯ ในทำเลที่คุณสนใจ พร้อมเปิดให้ต่อรองโดยตรงกับผู้ขายที่ผ่านการยืนยันตัวตน</p>
        <Link
          href="/activities"
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]/50"
        >
          <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" />
          ตารางกิจกรรม ทัวร์สด & Q&A
        </Link>
      </div>
      <section className="px-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--success)]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--success)]">Live Now (กำลังจัดขึ้น)</h2>
        </div>
        <div className="flex flex-col gap-4">
          {live.map((y) => (
            <div className="rounded-3xl overflow-hidden bg-[var(--surface)] border border-[var(--accent)]/30 shadow-xl shadow-[var(--accent)]/5" key={y.id}>
              <div className="relative h-48 p-5 flex flex-col justify-end bg-gradient-to-br from-[#0D1A12] via-[#13171C] to-[#0E1216]">
                {y.banner_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={y.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                )}
                <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-[var(--accent)]/10 blur-2xl pointer-events-none" />
                <div className="relative flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    LIVE DWELLY
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] flex items-center gap-1 border border-[var(--border)]">
                    <Clock4 className="w-3 h-3 text-[var(--accent)]" />
                    เหลือเวลา {countdown(y.ends_at)}
                  </span>
                </div>
                <h3 className="relative text-xl font-extrabold text-[var(--text-primary)] leading-tight">{y.name}</h3>
                <p className="relative text-xs text-[var(--text-secondary)] mt-1 font-medium">{where(y)}</p>
              </div>
              <div className="p-4 flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-2)]/40">
                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <strong className="text-[var(--text-primary)] font-bold">{y.property_count}</strong> ยูนิต
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <strong className="text-[var(--text-primary)] font-bold">{y.seller_count}</strong> ผู้ขาย
                  </span>
                </div>
                <Link
                  href={`/hubs/${y.slug}`}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)] flex items-center gap-1.5 shadow-md shadow-[var(--accent)]/20 hover:opacity-90 active:scale-95 transition-all shrink-0"
                >
                  เข้าชมโครงการ Dwelly
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
          {live.length === 0 && <p className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">ยังไม่มีโครงการที่กำลังจัดในขณะนี้</p>}
        </div>
      </section>
      {upcoming.length > 0 && (
        <section className="px-4 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--warning)] mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Upcoming (เร็วๆ นี้)
          </h2>
          <div className="flex flex-col gap-3">
            {upcoming.map((y) => (
              <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-3" key={y.id}>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--warning)]">Starts {day(y.starts_at)}</span>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] mt-0.5 truncate">{y.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {where(y)} • ในอีก {countdown(y.starts_at)}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">{y.property_count} ยูนิตลงทะเบียนล่วงหน้า</p>
                </div>
                <Link
                  href={`/hubs/${y.slug}`}
                  className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-colors border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]/50"
                >
                  ดูรายละเอียด
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
      {ended.length > 0 && (
        <section className="px-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Archive (โครงการ Dwelly ที่สิ้นสุดแล้ว)</h2>
          <div className="flex flex-col gap-3 opacity-60">
            {ended.map((y) => (
              <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between" key={y.id}>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)]">สิ้นสุดเมื่อ {day(y.ends_at)}</span>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)] mt-0.5">{y.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {where(y)} • รวม {y.property_count} ยูนิต
                  </p>
                </div>
                <Link href={`/hubs/${y.slug}`} className="text-xs text-[var(--text-secondary)] underline hover:text-[var(--accent)]">
                  ดูสรุปรายการ
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
