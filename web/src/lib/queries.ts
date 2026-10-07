import type { SearchFilters } from "@/server/services/listings";
import type { PropertyCategory } from "@/lib/types";

export { PAGE_SIZE } from "@/server/services/listings";
export type { SearchFilters };

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
