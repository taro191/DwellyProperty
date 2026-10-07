import Link from "next/link";
import { BedDouble, Eye, MapPin, Maximize2, ShieldCheck, Sparkles } from "lucide-react";
import { Photo } from "@/components/photo";
import { FavoriteButton } from "@/components/favorite-button";
import { Badge } from "@/components/ui";
import { CATEGORY_LABEL, LISTING_TYPE_LABEL, STATUS_LABEL } from "@/lib/constants";
import { areaLabel, coverUrl, formatTHB, isFeatured, primaryPrice } from "@/lib/format";
import type { PropertyWithMedia } from "@/lib/types";

export function PropertyCard({
  property: p, favorited, signedIn, priority = false,
}: { property: PropertyWithMedia; favorited?: boolean; signedIn?: boolean; priority?: boolean }) {
  const price = primaryPrice(p);
  const area = areaLabel(p);
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-line bg-surface transition-colors hover:border-accent/50">
      <Link href={`/property/${p.code}`} className="block">
        <div className="relative aspect-[4/3]">
          <Photo src={coverUrl(p.property_media)} alt={p.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="transition-transform duration-500 group-hover:scale-105" priority={priority} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge tone="neutral" className="bg-black/60 backdrop-blur border-white/10 text-white">{LISTING_TYPE_LABEL[p.listing_type]}</Badge>
            {isFeatured(p) && (
              <Badge tone="warning" className="bg-black/60 backdrop-blur"><Sparkles className="h-3 w-3" /> แนะนำ</Badge>
            )}
            {p.status !== "active" && <Badge tone="info" className="bg-black/60 backdrop-blur">{STATUS_LABEL[p.status]}</Badge>}
          </div>
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-center gap-2 text-xs text-subtle">
            <span>{CATEGORY_LABEL[p.category]}</span>
            {p.is_verified && (
              <span className="inline-flex items-center gap-1 text-accent"><ShieldCheck className="h-3.5 w-3.5" /> ตรวจสอบแล้ว</span>
            )}
          </div>
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{p.title}</h3>
          <p className="flex items-center gap-1 truncate text-xs text-subtle">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> {[p.district, p.province].filter(Boolean).join(", ")}
          </p>
          <div className="flex items-end justify-between gap-2 pt-1">
            <p className="text-lg font-extrabold text-accent-strong">
              {price.label}
              <span className="text-xs font-medium text-subtle">{price.suffix}</span>
            </p>
            {p.listing_type === "sale_or_rent" && p.rent_price && (
              <p className="text-xs text-subtle">เช่า {formatTHB(p.rent_price)}/ด.</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            {p.bedrooms != null && p.category !== "land" && (
              <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{p.bedrooms === 0 ? "สตูดิโอ" : `${p.bedrooms} นอน`}</span>
            )}
            {area && <span className="inline-flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{area}</span>}
            <span className="ml-auto inline-flex items-center gap-1 text-subtle"><Eye className="h-3.5 w-3.5" />{p.views_count}</span>
          </div>
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <FavoriteButton propertyId={p.id} initial={Boolean(favorited)} signedIn={Boolean(signedIn)} />
      </div>
    </article>
  );
}

export function PropertyGrid({
  items, favorites, signedIn,
}: { items: PropertyWithMedia[]; favorites?: Set<string>; signedIn?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p, i) => (
        <PropertyCard key={p.id} property={p} favorited={favorites?.has(p.id)} signedIn={signedIn} priority={i < 3} />
      ))}
    </div>
  );
}
