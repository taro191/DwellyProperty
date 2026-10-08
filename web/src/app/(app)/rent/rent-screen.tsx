"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, ChevronDown, GraduationCap, Heart, House, Key, MapPin, PawPrint, Search, ShieldCheck, X } from "lucide-react";
import { useListingActions } from "@/components/app/use-listing-actions";
import { REGIONS, num, type ListingView } from "@/lib/listing-view";

const KINDS = [
  { id: "all", label: "เช่าทั้งหมด", icon: Key },
  { id: "condo", label: "คอนโดให้เช่า", icon: Building2 },
  { id: "house", label: "บ้านเดี่ยว/ทาวน์โฮม", icon: House },
  { id: "student", label: "ใกล้สถานศึกษา/มหาลัย", icon: GraduationCap },
  { id: "pet-friendly", label: "เลี้ยงสัตว์ได้", icon: PawPrint },
];
const BUDGETS = [
  { id: "all", label: "ทุกช่วงราคา" },
  { id: "under6k", label: "ไม่เกิน 6,000" },
  { id: "6k-10k", label: "6,000 – 10,000" },
  { id: "10k-15k", label: "10,000 – 15,000" },
  { id: "15k+", label: "15,000+" },
];
const MOVE_IN = [
  { id: "all", label: "ทุกช่วงเวลาเข้าอยู่" },
  { id: "immediate", label: "⚡ พร้อมเข้าอยู่ทันที" },
  { id: "within-month", label: "ภายใน 30 วัน" },
];
const STUDENT = ["มหิดล", "Student", "นักศึกษา", "มข", "มช", "มหาวิทยาลัย", "ใกล้มหาวิทยาลัย"];

const within30Days = (iso: string | null) => !iso || new Date(iso).getTime() <= Date.now() + 30 * 86_400_000;
const availabilityLabel = (p: ListingView) =>
  p.readyToMove ? "พร้อมอยู่" : p.availableFrom ? `ว่าง ${new Date(p.availableFrom).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}` : "ห้องว่าง";

/** Rental card (design: `Sx`). */
function RentalCard({ item: s, isSaved, onToggleSave }: { item: ListingView; isSaved: boolean; onToggleSave: (id: string) => void }) {
  return (
    <Link
      href={`/property/${s.code}`}
      className="group rounded-2xl overflow-hidden cursor-pointer bg-[var(--surface)] border border-sky-500/25 hover:border-sky-400/60 transition-all duration-200 flex flex-col justify-between shadow-sm active:scale-[0.98]"
    >
      <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.image} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-[0.88]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1 z-10">
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-400 text-black shadow-sm">
            <Key className="w-2.5 h-2.5" />
            ให้เช่า
          </span>
          {s.verified && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-2.5 h-2.5" />
              ตรวจแล้ว
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(s.id);
          }}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center bg-black/60 hover:bg-black text-white transition-colors z-10"
          aria-label="Save rental"
          aria-pressed={isSaved}
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${isSaved ? "fill-rose-500 text-rose-500" : "text-white"}`} />
        </button>
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-white z-10">
          <div className="flex items-baseline gap-0.5">
            <span className="font-black text-xs text-sky-300 drop-shadow-md">฿{num(s.rentPrice ?? 0)}</span>
            <span className="text-[9px] text-zinc-300 font-medium">/ด.</span>
          </div>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${s.readyToMove ? "bg-emerald-500/80 text-black border-emerald-400" : "bg-black/70 text-zinc-300 border-white/20"}`}>
            {availabilityLabel(s)}
          </span>
        </div>
      </div>
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-xs text-[var(--text-primary)] leading-tight line-clamp-2 min-h-[32px]">{s.name}</h4>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1 flex items-center gap-1 truncate">
            <MapPin className="w-2.5 h-2.5 shrink-0 text-sky-400" />
            <span className="truncate">{s.location}</span>
          </p>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] mt-1.5">
            <span>{s.bedrooms === 0 ? "Studio" : `${s.bedrooms} นอน`}</span>
            <span>•</span>
            <span>{s.size} ตร.ม.</span>
            <span>•</span>
            <span className="truncate">{s.furnishing === "full" ? "เฟอร์ครบ" : "พร้อมอยู่"}</span>
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-[var(--border)] flex items-center justify-between text-[9px]">
          <span className="text-[var(--text-secondary)] truncate">{s.sellerType === "owner" ? "เจ้าของปล่อยเอง" : "ผ่าน Agency"}</span>
          <span className="font-bold text-sky-400">ดูสัญญา ❯</span>
        </div>
      </div>
    </Link>
  );
}

/** Rentals (design: `Lx`, screen "rental-explore"). */
export function RentScreen({ properties: m, savedIds, signedIn }: { properties: ListingView[]; savedIds: string[]; signedIn: boolean }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [kind, setKind] = useState("all");
  const [budget, setBudget] = useState("all");
  const [moveIn, setMoveIn] = useState("all");
  const [ownerOnly, setOwnerOnly] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [kindOpen, setKindOpen] = useState(false);
  const actions = useListingActions(savedIds, signedIn);

  const regionLabel = REGIONS.find((r) => r.id === region)?.label || "ทั่วประเทศ";
  const kindLabel = KINDS.find((k) => k.id === kind)?.label || "เช่าทั้งหมด";
  const rentals = useMemo(() => m.filter((p) => p.category !== "land" && !p.tags.includes("ที่ดิน") && (p.rentPrice ?? 0) > 0), [m]);
  const list = useMemo(
    () =>
      rentals
        .filter((p) => {
          const rent = p.rentPrice || 0;
          if (query.trim()) {
            const q = query.toLowerCase().trim();
            if (!p.name.toLowerCase().includes(q) && !p.location.toLowerCase().includes(q) && !p.province.toLowerCase().includes(q) && !p.tags.some((t) => t.toLowerCase().includes(q)))
              return false;
          }
          if (region !== "all") {
            const r = REGIONS.find((x) => x.id === region);
            if (r && p.region !== region && !r.provinces.some((x) => p.location.includes(x))) return false;
          }
          if (kind === "condo") {
            if (p.category !== "condo") return false;
          } else if (kind === "house") {
            if (p.category !== "house" && p.category !== "townhome" && !p.name.includes("บ้าน")) return false;
          } else if (kind === "student") {
            if (!p.tags.some((t) => STUDENT.some((s) => t.includes(s))) && !p.location.includes("ศาลายา") && !p.name.includes("ม.")) return false;
          } else if (kind === "pet-friendly" && !p.petsAllowed && !p.tags.some((t) => t.includes("สัตว์เลี้ยง") || t.includes("Pet"))) return false;
          if ((budget === "under6k" && rent > 6e3) || (budget === "6k-10k" && (rent < 6e3 || rent > 1e4)) || (budget === "10k-15k" && (rent < 1e4 || rent > 15e3)) || (budget === "15k+" && rent < 15e3))
            return false;
          if (moveIn === "immediate" && !p.readyToMove) return false;
          if (moveIn === "within-month" && !within30Days(p.availableFrom)) return false;
          return !(ownerOnly && p.sellerType !== "owner");
        })
        .sort((a, b) => (a.rentPrice || 0) - (b.rentPrice || 0)),
    [rentals, query, region, kind, budget, moveIn, ownerOnly],
  );
  const clear = () => {
    setQuery("");
    setKind("all");
    setBudget("all");
    setMoveIn("all");
    setOwnerOnly(false);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] pb-safe-nav bg-[var(--bg)]">
      <div className="mx-4 mt-3 p-4 rounded-3xl bg-gradient-to-br from-[#071724] via-[var(--surface)] to-[#0c1813] border border-sky-500/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-sky-400 text-black shadow-sm">THAILAND RENTAL HUB</span>
            <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> สัญญามาตรฐาน สคบ.
            </span>
          </div>
          <span className="text-xs font-black text-sky-400 tabular-nums">{list.length} รายการ</span>
        </div>
        <h1 className="font-extrabold text-lg text-[var(--text-primary)] leading-tight tracking-tight">ค้นหาห้องเช่า คอนโด & บ้านให้เช่าทั่วประเทศ</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">ตรวจห้องจริงก่อนเข้าพัก สัญญาโปร่งใส ไม่บวกเพิ่ม ทั่วกรุงเทพฯ ปริมณฑล เชียงใหม่ พัทยา ภูเก็ต</p>
        <div className="relative mt-3.5">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาคอนโด/บ้านเช่า เช่น สุขุมวิท, นิมมาน เชียงใหม่, พัทยา, ภูเก็ต..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/40 border border-sky-500/30 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-sky-400 outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white" aria-label="ล้างคำค้นหา">
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
            className={`w-full px-3 py-2.5 rounded-2xl bg-[var(--surface)] border text-xs font-bold flex items-center justify-between shadow-sm cursor-pointer transition-all ${region !== "all" || regionOpen ? "border-sky-400 text-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-primary)] hover:border-sky-400/50"}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">{regionLabel}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform shrink-0 ${regionOpen ? "rotate-180 text-sky-400" : ""}`} />
          </button>
          {regionOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setRegionOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl z-40 space-y-1 max-h-60 overflow-y-auto">
                <p className="text-[10px] font-bold text-[var(--text-secondary)] px-2 py-1">เลือกภูมิภาคที่เช่า</p>
                {REGIONS.map((r) => (
                  <button
                    type="button"
                    onClick={() => {
                      setRegion(r.id);
                      setRegionOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-left cursor-pointer transition-all ${region === r.id ? "bg-sky-400 text-black font-bold shadow-sm" : "text-[var(--text-primary)] hover:bg-[var(--surface-2)]"}`}
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
            className={`w-full px-3 py-2.5 rounded-2xl bg-[var(--surface)] border text-xs font-bold flex items-center justify-between shadow-sm cursor-pointer transition-all ${kind !== "all" || kindOpen ? "border-sky-400 text-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-primary)] hover:border-sky-400/50"}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Key className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">{kindLabel}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform shrink-0 ${kindOpen ? "rotate-180 text-sky-400" : ""}`} />
          </button>
          {kindOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setKindOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl z-40 space-y-1 max-h-60 overflow-y-auto">
                <p className="text-[10px] font-bold text-[var(--text-secondary)] px-2 py-1">เลือกประเภทห้องเช่า</p>
                {KINDS.map((k) => {
                  const Icon = k.icon;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setKind(k.id);
                        setKindOpen(false);
                      }}
                      className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-left cursor-pointer transition-all ${kind === k.id ? "bg-sky-400 text-black font-bold shadow-sm" : "text-[var(--text-primary)] hover:bg-[var(--surface-2)]"}`}
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
      <div className="mx-4 mt-3 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] shrink-0 mr-1">งบค่าเช่า:</span>
          {BUDGETS.map((b) => (
            <button
              type="button"
              onClick={() => setBudget(b.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${budget === b.id ? "bg-sky-500 text-black font-bold" : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white"}`}
              key={b.id}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)] flex-wrap">
          <div className="flex items-center gap-1.5">
            {MOVE_IN.map((t) => (
              <button
                type="button"
                onClick={() => setMoveIn(t.id)}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${moveIn === t.id ? "bg-emerald-500 text-black" : "bg-[var(--surface-2)] text-[var(--text-secondary)]"}`}
                key={t.id}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOwnerOnly(!ownerOnly)}
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${ownerOnly ? "bg-sky-400 text-black" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>เจ้าของปล่อยเอง</span>
          </button>
        </div>
      </div>
      <div className="mx-4 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-sm text-[var(--text-primary)]">พบที่อยู่อาศัยให้เช่า {list.length} รายการ</span>
          {budget !== "all" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold">กรองงบแล้ว</span>}
        </div>
        <span className="text-xs text-[var(--text-secondary)]">เรียงตามราคาต่ำ-สูง</span>
      </div>
      <div className="mx-4 mt-3">
        {list.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)]">
            <Key className="w-10 h-10 text-sky-400/60 mx-auto mb-2" />
            <p className="font-bold text-sm text-[var(--text-primary)]">ไม่พบที่อยู่อาศัยให้เช่าที่ตรงกับเงื่อนไข</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">ลองขยายช่วงงบประมาณค่าเช่า หรือล้างคำค้นหา</p>
            <button type="button" onClick={clear} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-sky-400 text-black cursor-pointer shadow-md">
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {list.map((p) => (
              <RentalCard item={p} isSaved={actions.isSaved(p.id)} onToggleSave={actions.toggleSave} key={p.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
