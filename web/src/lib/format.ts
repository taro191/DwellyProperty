import type { Property, PropertyMedia } from "@/lib/types";
import { SUPABASE_URL } from "@/lib/env";

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

export function formatTHB(value: number | null | undefined): string {
  if (value == null) return "-";
  return "฿" + thb.format(Number(value));
}

/** Compact price: ฿2.35 ล้าน / ฿850K style for cards. */
export function formatPriceShort(value: number | null | undefined): string {
  if (value == null) return "-";
  const v = Number(value);
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ล้าน`;
  return formatTHB(v);
}

export function primaryPrice(p: Pick<Property, "listing_type" | "sale_price" | "rent_price">) {
  if (p.listing_type === "rent") return { label: formatTHB(p.rent_price), suffix: "/เดือน" };
  return { label: formatPriceShort(p.sale_price), suffix: "" };
}

const dateFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });
const dateTimeFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "-");
export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : "-");

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} วันที่แล้ว`;
  return formatDate(iso);
}

export function publicStorageUrl(bucket: string, path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function mediaUrl(m: Pick<PropertyMedia, "external_url" | "storage_path">): string {
  return m.external_url ?? publicStorageUrl("property-media", m.storage_path ?? "");
}

export function coverUrl(media: PropertyMedia[] | undefined): string | null {
  const first = [...(media ?? [])].filter((m) => m.kind === "image").sort((a, b) => a.sort_order - b.sort_order)[0];
  return first ? mediaUrl(first) : null;
}

export function areaLabel(p: Pick<Property, "category" | "usable_area_sqm" | "land_area_sqwa">) {
  if (p.category === "land" && p.land_area_sqwa) {
    const sqwa = Number(p.land_area_sqwa);
    const rai = Math.floor(sqwa / 400);
    const ngan = Math.floor((sqwa % 400) / 100);
    const wa = Math.round(sqwa % 100);
    return [rai && `${rai} ไร่`, ngan && `${ngan} งาน`, wa && `${wa} ตร.ว.`].filter(Boolean).join(" ") || `${sqwa} ตร.ว.`;
  }
  return p.usable_area_sqm ? `${Number(p.usable_area_sqm)} ตร.ม.` : null;
}

export const isFeatured = (p: Pick<Property, "featured_until">) =>
  Boolean(p.featured_until && new Date(p.featured_until) > new Date());
