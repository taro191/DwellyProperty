"use client";

import Link from "next/link";
import { CheckCircle2, Heart, MapPin, Rocket, Share2, Trees } from "lucide-react";
import { landSizeLabel, num, type ListingView } from "@/lib/listing-view";

type CardProps = {
  property: ListingView;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  onShare?: (p: ListingView) => void;
};

const stop = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

/** Large listing card (design: `w1`); `compact` drops the tags + button footer. */
export function ListingCard({ property: s, compact = false, isSaved = false, onToggleSave, onShare }: CardProps & { compact?: boolean }) {
  const land = s.land;
  const perUnit = land
    ? `฿${num(land.pricePerSqWa)}/ตร.ว.`
    : `฿${num(s.size > 0 ? Math.round(s.price / s.size) : 0)}/sqm`;
  return (
    <Link
      href={`/property/${s.code}`}
      className="block group rounded-2xl overflow-hidden cursor-pointer flex-shrink-0 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all duration-200"
    >
      <div className={`relative ${compact ? "h-36" : "h-48"} overflow-hidden bg-[var(--surface-2)]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.image} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          {land && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-black shadow-sm backdrop-blur-sm">
              <Trees className="w-3 h-3 stroke-[2.5]" />
              ที่ดิน (Land)
            </span>
          )}
          {s.verified && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/80 text-[var(--success)] border border-[var(--success)]/30 backdrop-blur-sm">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </span>
          )}
          {s.isBoosted && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm backdrop-blur-sm animate-pulse">
              <Rocket className="w-3 h-3 stroke-[2.5]" />
              Boosted
            </span>
          )}
        </div>
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {onShare && (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onShare(s);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/70 hover:bg-[#06C755] text-white transition-colors cursor-pointer shadow-sm active:scale-95"
              title="แชร์เข้า LINE / โซเชียล"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onToggleSave?.(s.id);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-black/70 hover:bg-black text-white transition-colors cursor-pointer shadow-sm"
            aria-label="Save property"
            aria-pressed={isSaved}
          >
            <Heart className={`w-4 h-4 transition-colors ${isSaved ? "fill-[var(--accent)] text-[var(--accent)]" : "text-white"}`} />
          </button>
        </div>
        <div className="absolute bottom-2.5 right-2.5 z-10">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 backdrop-blur-sm">
            {s.matchScore}% Match
          </div>
        </div>
      </div>
      <div className="p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight text-[var(--text-primary)] truncate">{s.name}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {s.location}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-extrabold text-sm text-[var(--text-primary)]">฿{num(s.price)}</p>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium">{perUnit}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-2">
            {land ? (
              <>
                <span className="font-bold text-[var(--text-primary)]">{landSizeLabel(land)}</span>
                <span>•</span>
                <span>{land.deedType ? "ครุฑแดง" : "มีโฉนด"}</span>
                <span>•</span>
                <span className="capitalize">{s.sellerType === "owner" ? "เจ้าของโดยตรง" : "ผ่าน Agency"}</span>
              </>
            ) : (
              <>
                <span>{s.size} sqm</span>
                <span>•</span>
                <span>{s.bedrooms === 0 ? "Studio" : `${s.bedrooms} Bed`}</span>
                <span>•</span>
                <span className="capitalize">{s.sellerType === "owner" ? "Owner Direct" : "Agency"}</span>
              </>
            )}
          </div>
        </div>
        {!compact && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-1.5">
              {s.tags.slice(0, 3).map((t) => (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <span className="w-full py-2.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 active:scale-[0.99] transition-all text-center">
              View Property Details
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

/** Two-column grid card (design: `bx`). */
export function ListingGridCard({ property: s, isSaved = false, onToggleSave, onShare }: CardProps) {
  const land = s.land;
  return (
    <Link
      href={`/property/${s.code}`}
      className="group rounded-2xl overflow-hidden cursor-pointer bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all duration-200 flex flex-col justify-between shadow-sm active:scale-[0.98]"
    >
      <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-[var(--surface-2)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.image} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1 z-10">
          {land && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-black shadow-sm">
              <Trees className="w-2.5 h-2.5" />
              ที่ดิน
            </span>
          )}
          {s.isBoosted && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm">
              <Rocket className="w-2.5 h-2.5" />
              Boost
            </span>
          )}
          {s.verified && !s.isBoosted && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-2.5 h-2.5" />
              ตรวจแล้ว
            </span>
          )}
        </div>
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
          {onShare && (
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onShare(s);
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-black/60 hover:bg-[#06C755] text-white transition-colors cursor-pointer shadow-sm active:scale-95"
            title="แชร์เข้า LINE / โซเชียล"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onToggleSave?.(s.id);
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-black/60 hover:bg-black text-white transition-colors cursor-pointer shadow-sm"
            aria-label="Save property"
            aria-pressed={isSaved}
          >
            <Heart className={`w-3.5 h-3.5 transition-colors ${isSaved ? "fill-[var(--accent)] text-[var(--accent)]" : "text-white"}`} />
          </button>
        </div>
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-white z-10">
          <span className="font-black text-xs text-[var(--accent)] drop-shadow-md">฿{num(s.price)}</span>
          <span className="text-[9px] font-bold bg-black/70 px-1.5 py-0.5 rounded border border-white/20">{s.matchScore}% Match</span>
        </div>
      </div>
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-xs text-[var(--text-primary)] leading-tight line-clamp-2 min-h-[32px]">{s.name}</h4>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1 flex items-center gap-1 truncate">
            <MapPin className="w-2.5 h-2.5 shrink-0 text-[var(--accent)]" />
            <span className="truncate">{s.location}</span>
          </p>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] mt-1.5">
            {land ? (
              <span className="font-semibold text-[var(--text-primary)] truncate">{landSizeLabel(land)}</span>
            ) : (
              <>
                <span>{s.size} ตร.ม.</span>
                <span>•</span>
                <span>{s.bedrooms === 0 ? "Studio" : `${s.bedrooms} นอน`}</span>
              </>
            )}
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-[var(--border)] flex items-center justify-between text-[9px]">
          <span className="text-[var(--text-secondary)] truncate">{s.sellerType === "owner" ? "เจ้าของโดยตรง" : "ผ่าน Agency"}</span>
          {s.rentPrice ? <span className="font-extrabold text-amber-400">เช่า ฿{num(s.rentPrice)}/ด.</span> : null}
        </div>
      </div>
    </Link>
  );
}
