import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PropertyCategory, PropertyWithMedia, Zone } from "@/lib/types";

export const LISTING_SELECT = "*, property_media(id, kind, storage_path, external_url, caption, sort_order)";
export const PAGE_SIZE = 18;

export interface SearchFilters {
  q?: string;
  type?: "sale" | "rent";
  category?: PropertyCategory;
  province?: string;
  zone?: string;
  min?: number;
  max?: number;
  beds?: number;
  verified?: boolean;
  pets?: boolean;
  sort?: "recommended" | "newest" | "price_asc" | "price_desc";
  page?: number;
  bbox?: [number, number, number, number]; // south, west, north, east
}

const CATEGORIES = ["condo", "house", "townhome", "land", "apartment", "commercial"];
const num = (v: unknown) => {
  const n = Number(v);
  return typeof v === "string" && v !== "" && Number.isFinite(n) ? n : undefined;
};

/** Parse untrusted URL search params into typed filters. */
export function parseFilters(sp: Record<string, string | string[] | undefined>): SearchFilters {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined) || undefined;
  const bboxParts = s("bbox")?.split(",").map(Number);
  return {
    q: s("q")?.slice(0, 100),
    type: s("type") === "sale" || s("type") === "rent" ? (s("type") as "sale" | "rent") : undefined,
    category: CATEGORIES.includes(s("category") ?? "") ? (s("category") as PropertyCategory) : undefined,
    province: s("province"),
    zone: s("zone"),
    min: num(s("min")),
    max: num(s("max")),
    beds: num(s("beds")),
    verified: s("verified") === "1",
    pets: s("pets") === "1",
    sort: (["recommended", "newest", "price_asc", "price_desc"] as const).find((x) => x === s("sort")) ?? "recommended",
    page: Math.max(1, num(s("page")) ?? 1),
    bbox: bboxParts?.length === 4 && bboxParts.every(Number.isFinite) ? (bboxParts as SearchFilters["bbox"]) : undefined,
  };
}

export async function searchProperties(f: SearchFilters, opts: { limit?: number; mapOnly?: boolean } = {}) {
  const supabase = await createClient();
  const limit = opts.limit ?? PAGE_SIZE;
  const priceCol = f.type === "rent" ? "rent_price" : "sale_price";

  let query = supabase.from("properties").select(LISTING_SELECT, { count: "exact" }).in("status", ["active", "reserved"]);

  if (f.q) {
    const term = f.q.replace(/[%_,()]/g, " ");
    query = query.or(`title.ilike.%${term}%,project_name.ilike.%${term}%,district.ilike.%${term}%,address_line.ilike.%${term}%`);
  }
  if (f.type === "sale") query = query.in("listing_type", ["sale", "sale_or_rent"]);
  if (f.type === "rent") query = query.in("listing_type", ["rent", "sale_or_rent"]);
  if (f.category) query = query.eq("category", f.category);
  if (f.province) query = query.eq("province", f.province);
  if (f.zone) {
    const { data: zone } = await supabase.from("zones").select("id").eq("slug", f.zone).maybeSingle();
    query = query.eq("zone_id", zone?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (f.min != null) query = query.gte(priceCol, f.min);
  if (f.max != null) query = query.lte(priceCol, f.max);
  if (f.beds != null) query = query.gte("bedrooms", f.beds);
  if (f.verified) query = query.eq("is_verified", true);
  if (f.pets) query = query.eq("pets_allowed", true);
  if (f.bbox) {
    const [south, west, north, east] = f.bbox;
    query = query.gte("lat", south).lte("lat", north).gte("lng", west).lte("lng", east);
  }
  if (opts.mapOnly) query = query.not("lat", "is", null);

  switch (f.sort) {
    case "newest":
      query = query.order("published_at", { ascending: false, nullsFirst: false });
      break;
    case "price_asc":
      query = query.order(priceCol, { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order(priceCol, { ascending: false, nullsFirst: false });
      break;
    default:
      query = query
        .order("featured_until", { ascending: false, nullsFirst: false })
        .order("is_verified", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false });
  }

  const from = ((f.page ?? 1) - 1) * limit;
  const { data, count, error } = await query.range(from, from + limit - 1);
  if (error) console.error("[searchProperties]", error.message);
  return { items: (data ?? []) as PropertyWithMedia[], total: count ?? 0 };
}

export async function getZones(): Promise<Zone[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("zones").select("*").order("sort_order");
  return (data ?? []) as Zone[];
}

export async function getFavoriteIds(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("property_id").eq("user_id", userId);
  return new Set((data ?? []).map((f) => f.property_id as string));
}
