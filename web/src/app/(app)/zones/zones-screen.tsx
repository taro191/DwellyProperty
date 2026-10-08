"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Info, Layers, MapPin, Search, Sparkles, X } from "lucide-react";
import { ListingGridCard } from "@/components/app/listing-cards";
import { useListingActions } from "@/components/app/use-listing-actions";
import { ZONE_FALLBACK, ZONE_META } from "@/lib/zone-meta";
import { num, type ListingView } from "@/lib/listing-view";

export type ZoneItem = { id: string; slug: string; name: string; description: string | null };

const FILTERS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "land", label: "🏞️ แปลงที่ดิน" },
  { id: "condo", label: "🏢 คอนโดมิเนียม" },
  { id: "budget", label: "🏷️ งบประหยัด" },
  { id: "verified", label: "🛡️ Pod การันตี" },
];
const has = (p: ListingView, ...words: string[]) => p.tags.some((t) => words.some((w) => t.toLowerCase().includes(w.toLowerCase())));
const DAY = 86_400_000;

/** Which listings belong to a zone: assigned to it, or matching the zone's theme (design: gx `I`). */
function inZone(z: ZoneItem, p: ListingView): boolean {
  if (p.zoneId === z.id) return true;
  switch (z.slug) {
    case "land": return p.category === "land" || has(p, "ที่ดิน");
    case "near-mahidol": return has(p, "mahidol", "มหิดล") || p.location.includes("ศาลายา") || p.location.includes("Salaya");
    case "move-in-ready": return has(p, "ready", "พร้อม", "Move-in") || (p.readyToMove && p.furnishing === "full");
    case "investment": return has(p, "invest", "ลงทุน", "Yield");
    case "under-2m": return p.price <= 2e6 && p.category !== "land";
    case "owner-direct": return p.sellerType === "owner";
    case "pod-picks": return p.inPod || p.verified;
    case "new-today": return Date.now() - new Date(p.createdAt).getTime() < DAY || p.isBoosted;
    default: return false;
  }
}
function priceRange(items: ListingView[], fallback: string) {
  const prices = items.map((p) => p.price).filter((v) => v > 0);
  if (!prices.length) return fallback;
  const m = (v: number) => (v >= 1e6 ? `฿${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 2).replace(/\.?0+$/, "")}M` : `฿${num(v)}`);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? m(lo) : `${m(lo)} - ${m(hi)}`;
}

/** Dwelly Zones (design: `gx`, screen "festival-zones"); `selected` opens one zone's listings. */
export function ZonesScreen({
  zones, properties: m, savedIds, signedIn, selected,
}: { zones: ZoneItem[]; properties: ListingView[]; savedIds: string[]; signedIn: boolean; selected: string | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [deal, setDeal] = useState("all");
  const [sort, setSort] = useState("recommend");
  const actions = useListingActions(savedIds, signedIn);

  const members = useMemo(() => new Map(zones.map((z) => [z.id, m.filter((p) => inZone(z, p))])), [zones, m]);
  const shown = useMemo(
    () =>
      zones.filter((z) => {
        const meta = ZONE_META[z.slug] ?? ZONE_FALLBACK;
        const q = query.trim().toLowerCase();
        if (q && ![z.name, meta.thaiName, z.description ?? "", meta.tagline].some((s) => s.toLowerCase().includes(q))) return false;
        if (filter === "land") return z.slug === "land";
        if (filter === "condo") return z.slug !== "land";
        if (filter === "budget") return z.slug === "under-2m" || z.slug === "smart-picks";
        if (filter === "verified") return ["owner-direct", "pod-picks", "move-in-ready"].includes(z.slug);
        return true;
      }),
    [zones, query, filter],
  );
  const zone = selected ? zones.find((z) => z.slug === selected) ?? null : null;
  const list = useMemo(() => {
    if (!zone) return [];
    let items = members.get(zone.id) ?? [];
    if (deal === "sale") items = items.filter((p) => p.listingType !== "rent");
    else if (deal === "rent") items = items.filter((p) => !!p.rentPrice);
    if (sort === "priceAsc") items = [...items].sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") items = [...items].sort((a, b) => b.price - a.price);
    else if (sort === "views") items = [...items].sort((a, b) => b.views - a.views);
    return items;
  }, [zone, members, deal, sort]);

  if (zone) {
    const meta = ZONE_META[zone.slug] ?? ZONE_FALLBACK;
    const Icon = meta.icon;
    return (
      <div className="min-h-dvh pb-28 bg-[var(--bg)]">
        <div className="flex items-center justify-between px-4 h-14 bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/zones")}
              className="p-1.5 -ml-1.5 text-[var(--text-secondary)] hover:text-white rounded-xl hover:bg-[var(--surface-2)] transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-xs font-bold text-[var(--text-secondary)]">ทุกโซน</span>
            </button>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm text-[var(--text-primary)] truncate">{zone.name}</h2>
              <p className="text-[10px] text-[var(--text-secondary)] truncate">{meta.thaiName}</p>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${meta.bgTint} ${meta.accentColor} border ${meta.borderTint}`}>
            {meta.badgeText}
          </span>
        </div>
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meta.coverImage} alt={zone.name} className="w-full h-full object-cover brightness-[0.75]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${meta.bgTint} border ${meta.borderTint} shadow-md backdrop-blur-md`}>
                <Icon className={`w-5 h-5 ${meta.accentColor}`} />
              </div>
              <div>
                <h1 className="font-black text-xl text-white drop-shadow-md">{zone.name}</h1>
                <p className="text-xs font-medium text-white/90">{meta.thaiName}</p>
              </div>
            </div>
            <p className="text-xs text-white/80 leading-relaxed max-w-md line-clamp-2">{meta.subDescription}</p>
          </div>
        </div>
        <div className="mx-4 mt-3 p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center border-b border-[var(--border)] pb-3">
            <div className="p-2 rounded-2xl bg-[var(--surface-2)]">
              <span className="text-[10px] text-[var(--text-secondary)] block">จำนวนยูนิต</span>
              <span className="font-black text-base text-[var(--accent)]">{list.length} รายการ</span>
            </div>
            <div className="p-2 rounded-2xl bg-[var(--surface-2)]">
              <span className="text-[10px] text-[var(--text-secondary)] block">ช่วงราคา</span>
              <span className="font-black text-xs text-[var(--text-primary)] mt-1 block truncate">{priceRange(members.get(zone.id) ?? [], meta.priceRange)}</span>
            </div>
            <div className="p-2 rounded-2xl bg-[var(--surface-2)]">
              <span className="text-[10px] text-[var(--text-secondary)] block">สถานะโฉนด</span>
              <span className="font-black text-xs text-emerald-400 mt-1 flex items-center justify-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> ตรวจสอบแล้ว
              </span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">จุดเด่นสำคัญประจำโซน:</span>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-[var(--text-primary)]">
              {meta.highlights.map((h) => (
                <div className="flex items-center gap-1.5" key={h}>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{h}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--border)] flex items-center gap-1.5 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span className="text-[11px] font-bold text-[var(--text-secondary)]">ใกล้เคียง:</span>
            {meta.landmarks.map((l) => (
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)]" key={l}>
                {l}
              </span>
            ))}
          </div>
        </div>
        <div className="px-4 mt-5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-1.5 min-w-0">
              <span className="truncate">ประกาศอสังหาฯ ใน {zone.name}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-[var(--accent)]/15 text-[var(--accent)]">{list.length}</span>
            </h3>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="เรียงลำดับ"
              className="bg-[var(--surface-2)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="recommend">แนะนำล่าสุด</option>
              <option value="priceAsc">ราคา: ต่ำไปสูง</option>
              <option value="priceDesc">ราคา: สูงไปต่ำ</option>
              <option value="views">ยอดเข้าชมสูงสุด</option>
            </select>
          </div>
          <div className="flex gap-2">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "sale", label: "สำหรับขาย" },
              { id: "rent", label: "สำหรับเช่า" },
            ].map((d) => (
              <button
                type="button"
                onClick={() => setDeal(d.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${deal === d.id ? "bg-[var(--accent)] text-[var(--bg)] shadow-sm" : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-white"}`}
                key={d.id}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 mt-3">
          {list.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-2">
              <Info className="w-8 h-8 text-[var(--text-secondary)] mx-auto" />
              <p className="font-bold text-sm text-[var(--text-primary)]">ไม่พบทรัพย์ที่ตรงกับตัวกรอง</p>
              <p className="text-xs text-[var(--text-secondary)]">ลองเปลี่ยนตัวกรองเป็น &quot;ทั้งหมด&quot; เพื่อดูยูนิตอื่นๆ</p>
              <button type="button" onClick={() => setDeal("all")} className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)] cursor-pointer">
                แสดงทั้งหมด
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {list.map((p) => (
                <ListingGridCard property={p} isSaved={actions.isSaved(p.id)} onToggleSave={actions.toggleSave} key={p.id} />
              ))}
            </div>
          )}
        </div>
        <div className="px-4 mt-6">
          <Link
            href="/zones"
            className="w-full py-3.5 rounded-2xl bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-[var(--border)] text-xs font-black text-[var(--text-primary)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
          >
            <Layers className="w-4 h-4 text-[var(--accent)]" />
            <span>กลับไปเลือก Dwelly Zone อื่นๆ</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] pb-safe-nav bg-[var(--bg)]">
      <div className="mx-4 mt-3 p-4 rounded-3xl bg-gradient-to-br from-[#0c1813] via-[var(--surface)] to-[#111915] border border-[var(--accent)]/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-[var(--accent)]/10 blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              DWELLY CURATED ZONES
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">{zones.length} โซนคุณภาพ</span>
        </div>
        <h1 className="font-extrabold text-lg text-[var(--text-primary)] leading-tight tracking-tight">เลือกสำรวจตาม Dwelly Zone ที่ตอบโจทย์คุณ</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
          แสดงการ์ดคู่ ซ้าย-ขวา สะดวกต่อการเลื่อนดูและเปรียบเทียบ คลิกที่การ์ดเพื่อเข้าสู่ประกาศทรัพย์เฉพาะโซนนั้นๆ
        </p>
        <div className="relative mt-3.5">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาโซน เช่น มหิดล, ที่ดิน, งบประหยัด, Yield..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/40 border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent)] outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white" aria-label="ล้างคำค้นหา">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto mt-3 pb-1 no-scrollbar">
          {FILTERS.map((f) => (
            <button
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${filter === f.id ? "bg-[var(--accent)] text-[var(--bg)] font-bold shadow-sm" : "bg-black/30 text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]"}`}
              key={f.id}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-4 mt-5 flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-base text-[var(--text-primary)]">หมวดหมู่ Dwelly Zone ({shown.length})</h2>
          <p className="text-xs text-[var(--text-secondary)]">แตะที่การ์ดโซนเพื่อดูประกาศทรัพย์ภายในหัวข้อนั้น</p>
        </div>
      </div>
      <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
        {shown.map((z) => {
          const meta = ZONE_META[z.slug] ?? ZONE_FALLBACK;
          const Icon = meta.icon;
          const items = members.get(z.id) ?? [];
          return (
            <Link
              href={`/zones/${z.slug}`}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-all shadow-md group overflow-hidden cursor-pointer active:scale-[0.98] flex flex-col justify-between"
              key={z.id}
            >
              <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={meta.coverImage} alt={z.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-[0.80]" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-black/30 to-transparent" />
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${meta.bgTint} ${meta.accentColor} border ${meta.borderTint} backdrop-blur-md`}>
                    {meta.badgeText}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-black/70 text-white border border-white/20 backdrop-blur-md">{items.length} ยูนิต</span>
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${meta.bgTint} border ${meta.borderTint} shadow-md backdrop-blur-md`}>
                    <Icon className={`w-3.5 h-3.5 ${meta.accentColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-xs text-white drop-shadow truncate">{z.name}</h3>
                  </div>
                </div>
              </div>
              <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <p className="text-[10px] font-bold text-[var(--accent)] line-clamp-1">{meta.thaiName}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">{meta.subDescription}</p>
                </div>
                <div className="pt-2 border-t border-[var(--border)]">
                  <p className="text-[9px] font-black text-[var(--text-primary)] truncate">{priceRange(items, meta.priceRange)}</p>
                  <div className="w-full mt-2 py-1.5 rounded-lg font-black text-[10px] bg-[var(--surface-2)] group-hover:bg-[var(--accent)] group-hover:text-[var(--bg)] text-[var(--accent)] border border-[var(--accent)]/30 transition-all flex items-center justify-center gap-1 shadow-sm">
                    <span>ดูประกาศ</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
