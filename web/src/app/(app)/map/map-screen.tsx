"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, GraduationCap } from "lucide-react";
import { PinMap, type PinPoint } from "@/components/map";
import { num, type ListingView } from "@/lib/listing-view";

const nearMahidol = (p: ListingView) => [p.location, ...p.tags].some((t) => /mahidol|มหิดล|ศาลายา|salaya/i.test(t));

/** Dwelly Map (design: `Rx`, screen "map") on a real map. */
export function MapScreen({ properties: m, focus }: { properties: ListingView[]; focus: string | null }) {
  const located = useMemo(() => m.filter((p) => p.lat != null && p.lng != null), [m]);
  const focusId = focus ? (located.find((p) => p.code === focus)?.id ?? null) : null;
  const [selected, setSelected] = useState<string | null>(focusId);
  const [kind, setKind] = useState<"all" | "land" | "building">("all");
  const [mahidol, setMahidol] = useState(false);

  const shown = located.filter(
    (p) => !((kind === "land" && p.category !== "land") || (kind === "building" && p.category === "land") || (mahidol && !nearMahidol(p))),
  );
  const points: PinPoint[] = shown.map((p) => ({
    id: p.id,
    lat: p.lat!,
    lng: p.lng!,
    label: p.listingType === "rent" ? `฿${num(Math.round(p.price / 100) / 10)}k/ด.` : `฿${(p.price / 1e6).toFixed(1)}M`,
    land: p.category === "land",
    star: p.matchScore >= 90,
  }));
  const b = located.find((p) => p.id === selected) ?? null;

  return (
    <div className="h-[calc(100dvh-3.5rem)] flex flex-col bg-[var(--bg)] overflow-hidden">
      <div className="px-4 py-2 flex flex-col gap-2 z-10 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setKind("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${kind === "all" ? "bg-[var(--accent)] text-[var(--bg)] shadow-sm" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
          >
            ทั้งหมด ({located.length})
          </button>
          <button
            type="button"
            onClick={() => setKind("land")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${kind === "land" ? "bg-amber-400 text-black shadow-sm font-extrabold" : "bg-[var(--surface-2)] text-amber-400 border border-amber-500/30"}`}
          >
            <span>🏞️</span>
            <span>แปลงที่ดิน (Land)</span>
          </button>
          <button
            type="button"
            onClick={() => setKind("building")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${kind === "building" ? "bg-[var(--accent)] text-[var(--bg)] shadow-sm" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
          >
            🏢 คอนโด & บ้าน
          </button>
          <button
            type="button"
            onClick={() => setMahidol(!mahidol)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ml-auto whitespace-nowrap ${mahidol ? "bg-[var(--accent)] text-[var(--bg)]" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            ใกล้มหิดล
          </button>
        </div>
      </div>
      <div className="flex-1 relative bg-[#0D1520] overflow-hidden">
        <PinMap points={points} selected={selected} onSelect={setSelected} focus={focusId} />
        <div className="absolute top-3 right-3 p-3 rounded-2xl bg-black/85 border border-[var(--border)] text-[10px] flex flex-col gap-1.5 backdrop-blur-md z-[1000] shadow-xl pointer-events-none">
          <p className="font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">สัญลักษณ์บนแผนที่</p>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-amber-400 font-bold">แปลงที่ดิน (Land)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--text-primary)]" />
            <span className="text-[var(--text-secondary)]">คอนโด / ที่อยู่อาศัย</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[var(--accent)] font-semibold">รายการที่เลือก</span>
          </div>
        </div>
        {b && (
          <div className="absolute bottom-6 left-4 right-4 z-[1000] p-3.5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl">
            <div className="flex gap-3 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt={b.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-[var(--text-primary)] truncate">{b.name}</h4>
                  <span className="text-xs font-bold text-[var(--accent)] flex-shrink-0 ml-2">{b.matchScore}% Match</span>
                </div>
                {b.land ? (
                  <>
                    <p className="text-xs font-bold text-amber-400 mt-0.5">
                      ฿{num(b.price)} • {num(b.land.totalSqWa)} ตร.ว. ({b.land.rai} ไร่)
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{[b.land.deedType, b.land.zoning?.slice(0, 15)].filter(Boolean).join(" • ") || b.location}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-bold">
                      ฿{num(b.price)}
                      {b.listingType === "rent" ? "/ด." : ""} • {b.size} ตร.ม.
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{b.tags.slice(0, 2).join(" • ") || b.location}</p>
                  </>
                )}
              </div>
              <Link
                href={`/property/${b.code}`}
                className={`self-center px-3.5 py-2.5 rounded-xl text-xs font-extrabold shadow-md hover:opacity-90 flex items-center gap-1 flex-shrink-0 cursor-pointer ${b.land ? "bg-amber-400 text-black" : "bg-[var(--accent)] text-[var(--bg)]"}`}
              >
                {b.land ? "ดูแปลงที่ดิน" : "ดูยูนิต"}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
