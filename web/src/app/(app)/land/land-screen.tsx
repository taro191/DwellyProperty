"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building, Car, CheckCircle2, ChevronDown, Heart, Layers, MapPin, Rocket, Search, Share2, SlidersHorizontal, Trees, Waves, X, Zap } from "lucide-react";
import { useListingActions } from "@/components/app/use-listing-actions";
import { REGIONS, landSizeLabel, num, type ListingView } from "@/lib/listing-view";

const KINDS = [
  { id: "all", label: "ที่ดินทั้งหมด", icon: Trees },
  { id: "river", label: "ริมน้ำ/วิวธรรมชาติ", icon: Waves },
  { id: "mainroad", label: "ติดถนนใหญ่/เมน", icon: Car },
  { id: "build-home", label: "เหมาะสร้างบ้าน (100-200 ตร.ว.)", icon: Building },
  { id: "large", label: "แปลงใหญ่ (2 ไร่ขึ้นไป)", icon: Layers },
  { id: "commercial", label: "ผังสีส้ม/แดง (พาณิชย์)", icon: Zap },
];
const SORTS = [
  { id: "recommended", label: "แนะนำ" },
  { id: "price-asc", label: "ราคา ฿↑" },
  { id: "price-desc", label: "ราคา ฿↓" },
  { id: "size-desc", label: "เนื้อที่ใหญ่สุด" },
  { id: "size-asc", label: "เนื้อที่กะทัดรัด" },
  { id: "sqwa-price-asc", label: "ราคา/ตร.ว. ต่ำสุด" },
];
const QUICK = [
  { label: "ทุกราคา", min: 0, max: 5e7 },
  { label: "< 5 ล้าน", min: 0, max: 5e6 },
  { label: "< 10 ล้าน", min: 0, max: 1e7 },
  { label: "10 - 20 ล้าน", min: 1e7, max: 2e7 },
  { label: "20 ล้าน+", min: 2e7, max: 5e7 },
];
const ANY = 5e7;
const millions = (v: number) => (v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1);
const sqwaOf = (k: ListingView) => k.land?.totalSqWa || k.size / 4;
const perSqwa = (k: ListingView) => k.land?.pricePerSqWa || (k.land?.totalSqWa ? k.price / k.land.totalSqWa : k.price);

/** Land card (design: `Dx`). */
function LandCard({ land: s, isSaved, onToggleSave, onShare }: { land: ListingView; isSaved: boolean; onToggleSave: (id: string) => void; onShare: (p: ListingView) => void }) {
  const l = s.land;
  const per = l?.pricePerSqWa || (l && l.totalSqWa > 0 ? Math.round(s.price / l.totalSqWa) : 0);
  return (
    <Link
      href={`/property/${s.code}`}
      className="group rounded-2xl overflow-hidden cursor-pointer bg-[var(--surface)] border border-amber-500/25 hover:border-amber-400/60 transition-all duration-200 flex flex-col justify-between shadow-sm active:scale-[0.98]"
    >
      <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.image} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-[0.85]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1 z-10">
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-black shadow-sm">
            <Trees className="w-2.5 h-2.5" />
            {l?.deedType || "ที่ดิน"}
          </span>
          {s.isBoosted && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm">
              <Rocket className="w-2.5 h-2.5" />
              Boost
            </span>
          )}
        </div>
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShare(s);
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-black/60 hover:bg-[#06C755] text-white transition-colors cursor-pointer shadow-sm active:scale-95"
            title="แชร์เข้า LINE / โซเชียล"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave(s.id);
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-black/60 hover:bg-black text-white transition-colors cursor-pointer shadow-sm"
            aria-label="Save property"
            aria-pressed={isSaved}
          >
            <Heart className={`w-3.5 h-3.5 transition-colors ${isSaved ? "fill-amber-400 text-amber-400" : "text-white"}`} />
          </button>
        </div>
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-white z-10 gap-1">
          <span className="font-black text-xs text-amber-300 drop-shadow-md truncate">฿{num(s.price)}</span>
          {l && (
            <span className="text-[9px] font-extrabold bg-black/70 px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 shrink-0 max-w-[90px] truncate">{landSizeLabel(l)}</span>
          )}
        </div>
      </div>
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-xs text-[var(--text-primary)] leading-tight line-clamp-2 min-h-[32px]">{s.name}</h4>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1 flex items-center gap-1 truncate">
            <MapPin className="w-2.5 h-2.5 shrink-0 text-amber-400" />
            <span className="truncate">{s.location}</span>
          </p>
          <div className="mt-2 p-1.5 rounded-xl bg-[var(--surface-2)]/80 border border-[var(--border)] text-[10px] space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">เฉลี่ยต่อ ตร.ว.:</span>
              <span className="font-extrabold text-amber-400">฿{num(per)}</span>
            </div>
            {l?.roadFrontage ? (
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">หน้ากว้างติดถนน:</span>
                <span className="font-bold text-[var(--text-primary)]">{l.roadFrontage} ม.</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-[var(--border)] flex items-center justify-between text-[9px]">
          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> พร้อมโอน
          </span>
          <span className="text-[var(--text-secondary)] truncate">{s.sellerType === "owner" ? "เจ้าของโดยตรง" : "ผ่าน Agency"}</span>
        </div>
      </div>
    </Link>
  );
}

/** Land market (design: `kx`, screen "land-explore"). */
export function LandScreen({ properties: m, savedIds, signedIn }: { properties: ListingView[]; savedIds: string[]; signedIn: boolean }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [kind, setKind] = useState("all");
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(ANY);
  const [regionOpen, setRegionOpen] = useState(false);
  const [kindOpen, setKindOpen] = useState(false);
  const actions = useListingActions(savedIds, signedIn);

  const regionLabel = REGIONS.find((r) => r.id === region)?.label || "ทั่วประเทศ";
  const kindLabel = KINDS.find((k) => k.id === kind)?.label || "ที่ดินทั้งหมด";
  const lands = useMemo(() => m.filter((k) => k.category === "land" || k.tags.includes("ที่ดิน")), [m]);
  const list = useMemo(
    () =>
      lands
        .filter((k) => {
          if (query.trim()) {
            const q = query.toLowerCase().trim();
            const hit =
              k.name.toLowerCase().includes(q) ||
              k.location.toLowerCase().includes(q) ||
              k.province.toLowerCase().includes(q) ||
              k.tags.some((t) => t.toLowerCase().includes(q)) ||
              k.land?.deedType?.toLowerCase().includes(q) ||
              k.land?.zoning?.toLowerCase().includes(q);
            if (!hit) return false;
          }
          if (region !== "all") {
            const r = REGIONS.find((x) => x.id === region);
            if (r && k.region !== region && !r.provinces.some((x) => k.location.includes(x))) return false;
          }
          if (kind === "river") {
            if (!(k.name.includes("ริมน้ำ") || k.location.includes("คลอง") || k.tags.some((t) => t.includes("ริมน้ำ") || t.includes("คลอง")))) return false;
          } else if (kind === "mainroad") {
            if (!(k.tags.some((t) => t.includes("ติดถนนใหญ่")) || k.name.includes("ถนน") || (k.land?.roadFrontage ?? 0) >= 25)) return false;
          } else if (kind === "build-home") {
            if (!(k.tags.some((t) => t.includes("สร้างบ้าน") || t.includes("Ready to Build")) || (k.land?.totalSqWa && k.land.totalSqWa <= 300))) return false;
          } else if (kind === "large") {
            if (!((k.land?.rai ?? 0) >= 2 || (k.land?.totalSqWa ?? 0) >= 800 || k.size >= 3200)) return false;
          } else if (kind === "commercial" && !(k.land?.zoning?.includes("สีส้ม") || k.land?.zoning?.includes("สีแดง") || k.tags.some((t) => t.includes("ผังสีส้ม") || t.includes("พาณิชย์"))))
            return false;
          return !(k.price < min || (max < ANY && k.price > max));
        })
        .sort((a, b) => {
          if (sort === "price-asc") return a.price - b.price;
          if (sort === "price-desc") return b.price - a.price;
          if (sort === "size-desc") return sqwaOf(b) - sqwaOf(a);
          if (sort === "size-asc") return sqwaOf(a) - sqwaOf(b);
          if (sort === "sqwa-price-asc") return perSqwa(a) - perSqwa(b);
          return b.matchScore - a.matchScore;
        }),
    [lands, query, region, kind, sort, min, max],
  );
  const budgetLabel =
    max >= ANY && min === 0 ? "ทุกระดับราคา" : min > 0 && max < ANY ? `฿${millions(min)}M - ฿${millions(max)}M` : min > 0 ? `฿${millions(min)}M ขึ้นไป` : `ไม่เกิน ฿${millions(max)}M`;

  return (
    <div className="min-h-screen min-h-[100dvh] pb-safe-nav bg-[var(--bg)]">
      <div className="mx-4 mt-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหา เช่น สุขุมวิท, แม่ออน เชียงใหม่, ชลบุรี, ริมคลอง, ถมแล้ว..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-amber-400 outline-none shadow-sm"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white cursor-pointer" aria-label="ล้างคำค้นหา">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2 relative z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setRegionOpen(!regionOpen);
              setKindOpen(false);
            }}
            className={`w-full px-3 py-2.5 rounded-2xl bg-[var(--surface)] border text-xs font-bold flex items-center justify-between shadow-sm cursor-pointer transition-all ${region !== "all" || regionOpen ? "border-amber-400 text-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-primary)] hover:border-amber-400/50"}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{regionLabel}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform shrink-0 ${regionOpen ? "rotate-180 text-amber-400" : ""}`} />
          </button>
          {regionOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setRegionOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl z-40 space-y-1 max-h-60 overflow-y-auto">
                <p className="text-[10px] font-bold text-[var(--text-secondary)] px-2 py-1">เลือกภูมิภาคที่ดิน</p>
                {REGIONS.map((r) => (
                  <button
                    type="button"
                    onClick={() => {
                      setRegion(r.id);
                      setRegionOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-left cursor-pointer transition-all ${region === r.id ? "bg-amber-400 text-black font-bold shadow-sm" : "text-[var(--text-primary)] hover:bg-[var(--surface-2)]"}`}
                    key={r.id}
                  >
                    <span className="truncate">{r.label}</span>
                    {region === r.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setKindOpen(!kindOpen);
              setRegionOpen(false);
            }}
            className={`w-full px-3 py-2.5 rounded-2xl bg-[var(--surface)] border text-xs font-bold flex items-center justify-between shadow-sm cursor-pointer transition-all ${kind !== "all" || kindOpen ? "border-amber-400 text-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-primary)] hover:border-amber-400/50"}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Trees className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{kindLabel}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform shrink-0 ${kindOpen ? "rotate-180 text-amber-400" : ""}`} />
          </button>
          {kindOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setKindOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl z-40 space-y-1 max-h-60 overflow-y-auto">
                <p className="text-[10px] font-bold text-[var(--text-secondary)] px-2 py-1">เลือกประเภทที่ดิน</p>
                {KINDS.map((k) => {
                  const Icon = k.icon;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setKind(k.id);
                        setKindOpen(false);
                      }}
                      className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-left cursor-pointer transition-all ${kind === k.id ? "bg-amber-400 text-black font-bold shadow-sm" : "text-[var(--text-primary)] hover:bg-[var(--surface-2)]"}`}
                      key={k.id}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{k.label}</span>
                      </div>
                      {kind === k.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-black text-[var(--text-primary)]">แถบสไลด์ค้นหาตามช่วงราคา</p>
              <p className="text-[10px] text-[var(--text-secondary)]">ลากแถบสไลด์เพื่อปรับงบประมาณที่ต้องการ</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-amber-400 tabular-nums">{budgetLabel}</span>
            <p className="text-[9px] text-[var(--text-secondary)]">{max >= ANY && min === 0 ? "ไม่จำกัดงบประมาณ" : `งบสูงสุด ฿${num(max)}`}</p>
          </div>
        </div>
        <div className="px-1 pt-1">
          <div className="relative flex items-center">
            <input
              type="range"
              min="2000000"
              max="50000000"
              step="500000"
              value={max}
              aria-label="งบประมาณสูงสุด"
              onChange={(e) => {
                const v = Number(e.target.value);
                setMax(v);
                if (v < min) setMin(0);
              }}
              className="w-full h-2.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-amber-400 border border-[var(--border)]"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)] mt-1.5 px-0.5 tabular-nums">
            <span>฿2M</span>
            <span>฿10M</span>
            <span>฿25M</span>
            <span>฿35M</span>
            <span>฿50M+ (ทุกราคา)</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-[var(--border)]">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] shrink-0">งบลัด:</span>
          {QUICK.map((k) => {
            const on = min === k.min && max === k.max;
            return (
              <button
                type="button"
                onClick={() => {
                  setMin(k.min);
                  setMax(k.max);
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${on ? "bg-amber-400 text-black shadow-sm font-extrabold" : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)]"}`}
                key={k.label}
              >
                {k.label}
              </button>
            );
          })}
          {(min > 0 || max < ANY) && (
            <button
              type="button"
              onClick={() => {
                setMin(0);
                setMax(ANY);
              }}
              className="text-[10px] font-bold text-amber-400 hover:underline shrink-0 ml-auto cursor-pointer"
            >
              ล้างงบ
            </button>
          )}
        </div>
      </div>
      <div className="mx-4 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-sm text-[var(--text-primary)]">พบที่ดิน {list.length} แปลง</span>
        </div>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="เรียงลำดับ"
            className="text-xs font-semibold bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--text-primary)] focus:outline-none cursor-pointer"
          >
            {SORTS.map((k) => (
              <option value={k.id} key={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mx-4 mt-3">
        {list.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)]">
            <Trees className="w-10 h-10 text-amber-400/60 mx-auto mb-2" />
            <p className="font-bold text-sm text-[var(--text-primary)]">ไม่พบแปลงที่ดินที่ตรงกับเงื่อนไข</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">ลองล้างคำค้นหาหรือเปลี่ยนตัวเลือกผังเมือง/ขนาดเนื้อที่</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setKind("all");
                setRegion("all");
                setMin(0);
                setMax(ANY);
              }}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-black cursor-pointer shadow-md"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {list.map((k) => (
              <LandCard land={k} isSaved={actions.isSaved(k.id)} onToggleSave={actions.toggleSave} onShare={actions.share} key={k.id} />
            ))}
          </div>
        )}
      </div>
      {actions.shareSheet}
    </div>
  );
}
