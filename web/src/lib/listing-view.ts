import { coverUrl, isFeatured } from "@/lib/format";
import type { Furnishing, ListingType, PropertyCategory, PropertyWithMedia } from "@/lib/types";

/** Prototype regions (design: `he`) used by the region dropdowns. */
export const REGIONS = [
  { id: "all", label: "ทั่วประเทศ", provinces: [] as string[] },
  { id: "bangkok", label: "กรุงเทพฯ & ปริมณฑล", provinces: ["กรุงเทพมหานคร", "กรุงเทพฯ", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "นครปฐม"] },
  { id: "north", label: "ภาคเหนือ (เชียงใหม่)", provinces: ["เชียงใหม่", "เชียงราย", "ลำพูน", "พิษณุโลก"] },
  { id: "east", label: "ภาคตะวันออก (ชลบุรี/พัทยา)", provinces: ["ชลบุรี", "ระยอง", "ฉะเชิงเทรา"] },
  { id: "south", label: "ภาคใต้ (ภูเก็ต)", provinces: ["ภูเก็ต", "สุราษฎร์ธานี", "สงขลา", "กระบี่"] },
  { id: "northeast", label: "ภาคอีสาน (ขอนแก่น/โคราช)", provinces: ["ขอนแก่น", "นครราชสีมา", "อุดรธานี"] },
] as const;
export type RegionId = (typeof REGIONS)[number]["id"];

/** Prototype categories (design: `k1`). */
export const HOME_CATEGORIES = [
  { id: "all", label: "ทุกประเภททรัพย์" },
  { id: "condo", label: "คอนโดมิเนียม" },
  { id: "house", label: "บ้านเดี่ยว" },
  { id: "land", label: "ที่ดินแปลงสวย" },
  { id: "townhome", label: "ทาวน์โฮม" },
] as const;

export const SHARE_CATEGORY: Record<string, string> = {
  condo: "คอนโดมิเนียม", house: "บ้านเดี่ยว", townhome: "ทาวน์โฮม", commercial: "อาคารพาณิชย์", land: "ที่ดินเปล่า", apartment: "อพาร์ตเมนต์",
};

/** The listing shape the prototype's cards and screens read (plain data, safe to pass to client components). */
export interface ListingView {
  id: string;
  code: string;
  name: string;
  location: string;
  province: string;
  region: RegionId | null;
  /** Sale price, or the rent when the listing is rent-only (prototype: `price`). */
  price: number;
  rentPrice: number | null;
  listingType: ListingType;
  category: PropertyCategory;
  size: number;
  bedrooms: number;
  bathrooms: number;
  image: string;
  tags: string[];
  verified: boolean;
  isBoosted: boolean;
  sellerType: "owner" | "agency";
  zoneId: string | null;
  inPod: boolean;
  views: number;
  /** Map position; rounded to ~1 km when the owner hides the exact location. */
  lat: number | null;
  lng: number | null;
  matchScore: number;
  /** No move-in date, or it has passed. */
  readyToMove: boolean;
  availableFrom: string | null;
  furnishing: Furnishing | null;
  petsAllowed: boolean;
  createdAt: string;
  land: {
    rai: number;
    ngan: number;
    sqWa: number;
    totalSqWa: number;
    pricePerSqWa: number;
    deedType: string | null;
    zoning: string | null;
    roadFrontage: number | null;
  } | null;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80";

/**
 * Listing quality score shown as "% Match" on cards (design element). Until buyer preferences
 * from the Buyer Center feed in, it rates how complete and trustworthy the listing is.
 */
export function matchScore(p: PropertyWithMedia): number {
  let s = 70;
  if (p.is_verified) s += 12;
  const photos = p.property_media.filter((m) => m.kind === "image").length;
  s += Math.min(photos, 4) * 2;
  if (p.description && p.description.length > 80) s += 3;
  if (p.lat != null) s += 2;
  if (p.amenities.length >= 3) s += 2;
  return Math.min(s, 99);
}

export function regionOf(province: string): RegionId | null {
  return REGIONS.find((r) => r.id !== "all" && (r.provinces as readonly string[]).includes(province))?.id ?? null;
}

export function toListingView(p: PropertyWithMedia): ListingView {
  const sqwa = p.land_area_sqwa != null ? Number(p.land_area_sqwa) : p.category === "land" && p.usable_area_sqm ? Math.round(Number(p.usable_area_sqm) / 4) : 0;
  const sale = p.sale_price != null ? Number(p.sale_price) : null;
  const rent = p.rent_price != null ? Number(p.rent_price) : null;
  const price = sale ?? rent ?? 0;
  return {
    id: p.id,
    code: p.code,
    name: p.title,
    location: [p.district, p.province].filter(Boolean).join(", "),
    province: p.province,
    region: regionOf(p.province),
    price,
    rentPrice: rent,
    listingType: p.listing_type,
    category: p.category,
    size: p.usable_area_sqm != null ? Number(p.usable_area_sqm) : sqwa * 4,
    bedrooms: p.bedrooms ?? 0,
    bathrooms: p.bathrooms ?? 0,
    image: coverUrl(p.property_media) ?? FALLBACK_IMAGE,
    tags: [...p.tags, ...p.amenities].slice(0, 6),
    verified: p.is_verified,
    isBoosted: isFeatured(p),
    sellerType: p.agent_id ? "agency" : "owner",
    zoneId: p.zone_id,
    inPod: Boolean(p.pod_id),
    views: p.views_count,
    lat: p.lat == null ? null : p.show_exact_location ? Number(p.lat) : Math.round(Number(p.lat) * 100) / 100,
    lng: p.lng == null ? null : p.show_exact_location ? Number(p.lng) : Math.round(Number(p.lng) * 100) / 100,
    matchScore: matchScore(p),
    readyToMove: !p.available_from || new Date(p.available_from) <= new Date(),
    availableFrom: p.available_from,
    furnishing: p.furnishing,
    petsAllowed: Boolean(p.pets_allowed),
    createdAt: p.published_at ?? p.created_at,
    land:
      p.category === "land"
        ? {
            rai: p.land_details.rai ?? Math.floor(sqwa / 400),
            ngan: p.land_details.ngan ?? Math.floor((sqwa % 400) / 100),
            sqWa: p.land_details.sq_wa ?? Math.round(sqwa % 100),
            totalSqWa: sqwa,
            pricePerSqWa: p.land_details.price_per_sqwa ?? (sqwa > 0 && sale ? Math.round(sale / sqwa) : 0),
            deedType: p.land_details.deed_type ?? null,
            zoning: p.land_details.zoning ?? null,
            roadFrontage: p.land_details.road_frontage_m ?? null,
          }
        : null,
  };
}

/** "1 ไร่ 2 งาน 50 ตร.ว." (prototype land size label). */
export function landSizeLabel(l: NonNullable<ListingView["land"]>) {
  const { rai, ngan, sqWa, totalSqWa } = l;
  return `${rai > 0 ? `${rai} ไร่ ` : ""}${ngan > 0 ? `${ngan} งาน ` : ""}${sqWa > 0 || (rai === 0 && ngan === 0) ? `${sqWa || totalSqWa} ตร.ว.` : ""}`.trim();
}

/** Fixed locale so server and client render the same string. */
export const num = (n: number) => n.toLocaleString("en-US");
export const thb = (n: number) => `฿${num(n)}`;
export const hasRent = (p: ListingView) => p.listingType !== "sale" || (p.rentPrice ?? 0) > 0;
export const hasSale = (p: ListingView) => p.listingType !== "rent";
