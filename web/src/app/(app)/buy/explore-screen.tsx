"use client";

import { useMemo, useState } from "react";
import { Building, Building2, House, Search, Trees, X } from "lucide-react";
import { ListingCard } from "@/components/app/listing-cards";
import { useListingActions } from "@/components/app/use-listing-actions";
import type { ListingView } from "@/lib/listing-view";

const TABS = [
  { id: "all", label: "ทั้งหมด", icon: House },
  { id: "land", label: "ที่ดิน (Land)", icon: Trees },
  { id: "condo", label: "คอนโดมิเนียม", icon: Building2 },
  { id: "house", label: "บ้าน/ทาวน์โฮม", icon: Building },
];
const CHIPS = ["All", "กรุงเทพฯ", "เชียงใหม่", "ชลบุรี/พัทยา", "ภูเก็ต", "Under ฿3M", "Ready to Move", "Owner Direct", "Investment", "Verified Only"];
const SORTS = [
  { id: "recommended", label: "แนะนำ" },
  { id: "newest", label: "ล่าสุด" },
  { id: "price-asc", label: "ราคา ฿↑" },
  { id: "price-desc", label: "ราคา ฿↓" },
];

function chipMatch(c: ListingView, chip: string) {
  const inProv = (...names: string[]) => names.some((n) => c.location.includes(n) || c.province.includes(n));
  switch (chip) {
    case "กรุงเทพฯ": return inProv("กรุงเทพ");
    case "เชียงใหม่": return inProv("เชียงใหม่");
    case "ชลบุรี/พัทยา": return inProv("ชลบุรี", "พัทยา");
    case "ภูเก็ต": return inProv("ภูเก็ต");
    case "Under ฿3M": return c.price <= 3e6;
    case "Ready to Move": return c.readyToMove;
    case "Owner Direct": return c.sellerType === "owner";
    case "Investment": return c.tags.includes("Investment") || c.tags.includes("ลงทุน") || c.matchScore >= 90;
    case "Verified Only": return c.verified;
    default: return true;
  }
}

/** Buy / explore listings (design: `Ax`, screen "explore"). */
export function ExploreScreen({
  properties: m, savedIds, signedIn, initialCategory = "all", initialQuery = "",
}: { properties: ListingView[]; savedIds: string[]; signedIn: boolean; initialCategory?: string; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState("recommended");
  const [tab, setTab] = useState(initialCategory);
  const [chip, setChip] = useState("All");
  const actions = useListingActions(savedIds, signedIn);

  const list = useMemo(
    () =>
      m
        .filter((c) => {
          if ((tab === "land" && c.category !== "land") || (tab === "condo" && c.category === "land") || (tab === "house" && c.category !== "house" && c.category !== "townhome"))
            return false;
          const q = query.toLowerCase().trim();
          const hit =
            !q ||
            c.name.toLowerCase().includes(q) ||
            c.location.toLowerCase().includes(q) ||
            c.province.toLowerCase().includes(q) ||
            c.tags.some((t) => t.toLowerCase().includes(q)) ||
            (c.category === "land" && ("ที่ดิน".includes(q) || "land".includes(q) || "โฉนด".includes(q)));
          return hit && chipMatch(c, chip);
        })
        .sort((a, b) =>
          sort === "recommended" ? b.matchScore - a.matchScore : sort === "price-asc" ? a.price - b.price : sort === "price-desc" ? b.price - a.price : b.createdAt.localeCompare(a.createdAt),
        ),
    [m, query, tab, chip, sort],
  );

  return (
    <div className="min-h-screen min-h-[100dvh] pb-safe-nav bg-[var(--bg)]">
      <div className="px-4 pt-3">
        <div className="flex gap-1.5 p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] overflow-x-auto no-scrollbar">
          {TABS.map((c) => {
            const on = tab === c.id;
            const Icon = c.icon;
            return (
              <button
                type="button"
                onClick={() => setTab(c.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${on ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                key={c.id}
              >
                <Icon className={`w-3.5 h-3.5 ${on ? "stroke-[2.5]" : ""}`} />
                <span>{c.label}</span>
                {c.id === "land" && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-4 pt-2.5 pb-1">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] focus-within:border-[var(--accent)] transition-colors">
          <Search className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "land" ? "ค้นหาแปลงที่ดิน, ไร่, งาน, ตารางวา, โฉนดครุฑแดง..." : "ค้นหาทำเล, โครงการ, ที่ดิน, หรือคีย์เวิร์ด..."}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="p-1 rounded-full text-[var(--text-secondary)] hover:text-white" aria-label="ล้างคำค้นหา">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
        {CHIPS.map((c) => (
          <button
            type="button"
            onClick={() => setChip(c)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${chip === c ? "bg-[var(--accent)] text-[var(--bg)] shadow-sm" : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/40"}`}
            key={c}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 text-xs gap-2">
        <p className="text-[var(--text-secondary)] shrink-0">
          พบ <strong className="text-[var(--text-primary)] font-bold">{list.length}</strong> รายการ
        </p>
        <div className="flex items-center gap-1 bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] overflow-x-auto no-scrollbar min-w-0 max-w-full ml-auto">
          {SORTS.map((c) => (
            <button
              type="button"
              onClick={() => setSort(c.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${sort === c.id ? "bg-[var(--accent)] text-[var(--bg)] shadow-xs" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              key={c.id}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 flex flex-col gap-3.5">
        {list.map((c) => (
          <ListingCard property={c} isSaved={actions.isSaved(c.id)} onToggleSave={actions.toggleSave} key={c.id} />
        ))}
        {list.length === 0 && (
          <div className="text-center py-16 px-4 bg-[var(--surface)] rounded-3xl border border-[var(--border)] mt-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-3 text-2xl">🔍</div>
            <p className="font-bold text-base text-[var(--text-primary)]">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">ลองปรับคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูยูนิตอื่นๆ ในงานเทศกาล</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setChip("All");
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)]"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>
      {actions.shareSheet}
    </div>
  );
}
