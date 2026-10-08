"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, ChevronDown, ChevronRight, CirclePlus, Flame, House, Key, MapPin, Rocket, Search, Sparkles, X } from "lucide-react";
import { ListingCard, ListingGridCard } from "@/components/app/listing-cards";
import { useListingActions } from "@/components/app/use-listing-actions";
import { HOME_CATEGORIES, REGIONS, hasRent, type ListingView } from "@/lib/listing-view";

type Deal = "all" | "sale" | "rent";
type Tab = "all" | "boosted" | "new";

/** Home: Thailand property market (design: `fx`, screen "festival-home"). */
export function HomeScreen({ properties: m, savedIds, signedIn }: { properties: ListingView[]; savedIds: string[]; signedIn: boolean }) {
  const [tab, setTab] = useState<Tab>("all");
  const [deal, setDeal] = useState<Deal>("all");
  const [region, setRegion] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [regionOpen, setRegionOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const actions = useListingActions(savedIds, signedIn);

  const regionLabel = REGIONS.find((k) => k.id === region)?.label || "ทั่วประเทศ";
  const categoryLabel = HOME_CATEGORIES.find((k) => k.id === category)?.label || "ทุกประเภททรัพย์";

  const filtered = useMemo(
    () =>
      m.filter((k) => {
        if (deal === "sale") {
          if (k.listingType === "rent") return false;
        } else if (deal === "rent" && !hasRent(k)) return false;
        if (region !== "all") {
          const r = REGIONS.find((x) => x.id === region);
          if (r && k.region !== region && !r.provinces.some((p) => k.location.includes(p))) return false;
        }
        if (category !== "all") {
          if (category === "land") {
            if (!(k.category === "land" || k.tags.includes("ที่ดิน"))) return false;
          } else if (k.category !== category) return false;
        }
        if (query.trim()) {
          const q = query.toLowerCase().trim();
          if (
            !k.name.toLowerCase().includes(q) &&
            !k.location.toLowerCase().includes(q) &&
            !k.province.toLowerCase().includes(q) &&
            !k.tags.some((t) => t.toLowerCase().includes(q))
          )
            return false;
        }
        return true;
      }),
    [m, deal, region, category, query],
  );
  const boosted = useMemo(() => filtered.filter((k) => k.isBoosted), [filtered]);
  const newest = useMemo(() => [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [filtered]);
  const list = useMemo(() => {
    if (tab === "boosted") return boosted;
    if (tab === "new") return newest;
    const ids = new Set(boosted.map((k) => k.id));
    return [...boosted, ...newest.filter((k) => !ids.has(k.id))];
  }, [tab, boosted, newest]);

  const clear = () => {
    setDeal("all");
    setRegion("all");
    setCategory("all");
    setQuery("");
  };

  return (
    <div className="min-h-screen min-h-[100dvh] pb-safe-nav bg-[var(--bg)]">
      <div className="mx-4 mt-3 p-4 rounded-3xl bg-gradient-to-br from-[#0c1813] via-[var(--surface)] to-[#111915] border border-[var(--accent)]/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[var(--accent)]/10 blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--accent)] text-[var(--bg)] shadow-sm">THAILAND PROPERTY</span>
            <span className="text-[10px] font-bold text-[var(--accent)] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> ซื้อ • เช่า • ขาย ทั่วประเทศ
            </span>
          </div>
          <span className="text-xs font-black text-[var(--accent)] tabular-nums">{filtered.length} ประกาศ</span>
        </div>
        <h1 className="font-extrabold text-lg text-[var(--text-primary)] leading-tight tracking-tight">ตลาดอสังหาริมทรัพย์ชั้นนำ ซื้อ เช่า ขาย ทั่วไทย</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
          ค้นหาบ้านเดี่ยว คอนโด ที่ดิน และอาคารพาณิชย์ กรุงเทพฯ ปริมณฑล เชียงใหม่ พัทยา ภูเก็ต และทุกจังหวัด
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3.5">
          <button
            type="button"
            onClick={() => {
              setDeal("sale");
              setTab("all");
            }}
            className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${deal === "sale" ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] shadow-md" : "bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent)]/40"}`}
          >
            <House className="w-4 h-4" />
            <span className="text-xs font-extrabold">ซื้ออสังหาฯ</span>
            <span className={`text-[9px] ${deal === "sale" ? "text-[var(--bg)]/80" : "text-[var(--text-secondary)]"}`}>บ้าน/คอนโด/ที่ดิน</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDeal("rent");
              setTab("all");
            }}
            className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${deal === "rent" ? "bg-amber-400 text-black border-amber-400 shadow-md" : "bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border)] hover:border-amber-400/40"}`}
          >
            <Key className="w-4 h-4" />
            <span className="text-xs font-extrabold">เช่าอสังหาฯ</span>
            <span className={`text-[9px] ${deal === "rent" ? "text-black/80" : "text-[var(--text-secondary)]"}`}>ห้องเช่า/บ้านเช่า</span>
          </button>
          <Link
            href="/dashboard/listings/new"
            className="p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer bg-gradient-to-br from-emerald-600/30 to-teal-800/40 border border-emerald-500/40 text-emerald-300 hover:border-emerald-400"
          >
            <CirclePlus className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-extrabold">ลงประกาศ</span>
            <span className="text-[9px] text-emerald-400/80">ขาย/ให้เช่า ฟรี</span>
          </Link>
        </div>
        <div className="relative mt-3">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาทำเล เช่น สุขุมวิท, นิมมาน เชียงใหม่, ภูเก็ต, พัทยา, ศาลายา..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-black/40 border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent)] outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white cursor-pointer"
              aria-label="ล้างคำค้นหา"
            >
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
              setCategoryOpen(false);
            }}
            className={`w-full px-3 py-2.5 rounded-2xl bg-[var(--surface)] border text-xs font-bold flex items-center justify-between shadow-sm cursor-pointer transition-all ${region !== "all" || regionOpen ? "border-[var(--accent)] text-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]/50"}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="truncate">{regionLabel}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform shrink-0 ${regionOpen ? "rotate-180 text-[var(--accent)]" : ""}`} />
          </button>
          {regionOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setRegionOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl z-40 space-y-1 max-h-60 overflow-y-auto">
                <p className="text-[10px] font-bold text-[var(--text-secondary)] px-2 py-1">เลือกภูมิภาค / โซน</p>
                {REGIONS.map((k) => (
                  <button
                    type="button"
                    onClick={() => {
                      setRegion(k.id);
                      setRegionOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-left cursor-pointer transition-all ${region === k.id ? "bg-[var(--accent)] text-[var(--bg)] font-bold shadow-sm" : "text-[var(--text-primary)] hover:bg-[var(--surface-2)]"}`}
                    key={k.id}
                  >
                    <span className="truncate">{k.label}</span>
                    {region === k.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
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
              setCategoryOpen(!categoryOpen);
              setRegionOpen(false);
            }}
            className={`w-full px-3 py-2.5 rounded-2xl bg-[var(--surface)] border text-xs font-bold flex items-center justify-between shadow-sm cursor-pointer transition-all ${category !== "all" || categoryOpen ? "border-amber-400 text-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-primary)] hover:border-amber-400/50"}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{categoryLabel}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform shrink-0 ${categoryOpen ? "rotate-180 text-amber-400" : ""}`} />
          </button>
          {categoryOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setCategoryOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl z-40 space-y-1 max-h-60 overflow-y-auto">
                <p className="text-[10px] font-bold text-[var(--text-secondary)] px-2 py-1">เลือกประเภทอสังหาฯ</p>
                {HOME_CATEGORIES.map((k) => (
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(k.id);
                      setCategoryOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-left cursor-pointer transition-all ${category === k.id ? "bg-amber-400 text-black font-bold shadow-sm" : "text-[var(--text-primary)] hover:bg-[var(--surface-2)]"}`}
                    key={k.id}
                  >
                    <span className="truncate">{k.label}</span>
                    {category === k.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mx-4 mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${tab === "all" ? "bg-[var(--accent)] text-[var(--bg)] shadow-sm" : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>ทั้งหมด ({filtered.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("boosted")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${tab === "boosted" ? "bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm" : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"}`}
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>ติด Boost ({boosted.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("new")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${tab === "new" ? "bg-amber-400 text-black shadow-sm" : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"}`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>มาใหม่ ({newest.length})</span>
        </button>
      </div>

      {tab === "all" && boosted.length > 0 && (
        <section className="mt-5 px-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-sm">
                <Rocket className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-[var(--text-primary)]">ทรัพย์ที่ Boost ประกาศ (Featured Boost)</h2>
                <p className="text-[10px] text-[var(--text-secondary)]">ดีลเด่น เจ้าของ/นายหน้าโปรโมตตำแหน่งพิเศษทั่วไทย</p>
              </div>
            </div>
            <button type="button" onClick={() => setTab("boosted")} className="text-xs font-semibold text-[var(--accent)] flex items-center gap-0.5 hover:underline cursor-pointer">
              ดูทั้งหมด ({boosted.length})<ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            {boosted.map((k) => (
              <div className="w-64 flex-shrink-0" key={`boosted-${k.id}`}>
                <ListingCard property={k} compact isSaved={actions.isSaved(k.id)} onToggleSave={actions.toggleSave} onShare={actions.share} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-[var(--text-primary)]">
                {tab === "boosted"
                  ? `รายการทรัพย์ที่ Boost (${list.length})`
                  : tab === "new"
                    ? `รายการทรัพย์มาใหม่ล่าสุด (${list.length})`
                    : `รายการอสังหาฯ แนะนำ (${list.length})`}
              </h2>
              <p className="text-[10px] text-[var(--text-secondary)]">
                {deal === "sale" ? "ทรัพย์สำหรับซื้อ-ขาย โอนกรรมสิทธิ์" : deal === "rent" ? "ห้องเช่า/บ้านเช่า สัญญาพร้อมเข้าอยู่" : "ซื้อ เช่า ขาย ตรวจสอบกรรมสิทธิ์แล้ว"}
              </p>
            </div>
          </div>
          {(deal !== "all" || region !== "all" || category !== "all" || query) && (
            <button type="button" onClick={clear} className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer">
              ล้างตัวกรอง
            </button>
          )}
        </div>
        {list.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)]">
            <House className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-2 opacity-60" />
            <p className="font-bold text-sm text-[var(--text-primary)]">ไม่พบรายการอสังหาฯ ตามเงื่อนไขที่เลือก</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">ลองเปลี่ยนทำเล หรือล้างตัวกรองเพื่อดูทรัพย์ทั้งหมด</p>
            <button type="button" onClick={clear} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)] cursor-pointer shadow-md">
              ดูทรัพย์ทั่วประเทศทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {list.map((k) => (
              <ListingGridCard property={k} isSaved={actions.isSaved(k.id)} onToggleSave={actions.toggleSave} onShare={actions.share} key={k.id} />
            ))}
          </div>
        )}
      </section>
      {actions.shareSheet}
    </div>
  );
}
