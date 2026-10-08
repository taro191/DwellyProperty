import { cache } from "react";
import { getViewer } from "@/lib/auth";
import { favoriteIds, getListingByCode, getListingContactCard } from "@/server/services/listings";
import { commissionForViewer } from "@/server/services/trust";
import { DIRECTION_LABEL, FURNISHING_LABEL, STATUS_LABEL } from "@/lib/constants";
import { mediaUrl } from "@/lib/format";
import { toListingView, type ListingView } from "@/lib/listing-view";
import type { AppRole, PropertyStatus } from "@/lib/types";

/** Everything the property screens (design: Mx, lm, om) show, as plain data for client components. */
export interface PropertyDetail {
  view: ListingView;
  images: string[];
  description: string | null;
  address: string;
  status: PropertyStatus;
  statusLabel: string;
  rejectionReason: string | null;
  accepting: boolean;
  isMine: boolean;
  salePrice: number | null;
  specs: { label: string; value: string }[];
  rentTerms: string[];
  land: {
    roadType: string | null;
    shape: string | null;
    utilities: string[];
    suitableFor: string[];
  } | null;
  contact: {
    name: string;
    avatar: string | null;
    kyc: boolean;
    isAgent: boolean;
    agentCode: string | null;
    company: string | null;
    licenseVerified: boolean;
    closedDeals: number;
    rating: number;
    ratingCount: number;
  };
  pod: { name: string; trust: number } | null;
  commission: { rate: number | null; via: "owner" | "dwelly" } | null;
  yieldPct: number | null;
  matchFactors: { label: string; score: string }[];
  viewerRole: AppRole | null;
  signedIn: boolean;
  saved: boolean;
}

const dash = (v: unknown) => (v == null || v === "" ? "-" : String(v));

export const loadPropertyDetail = cache(async (code: string): Promise<PropertyDetail | null> => {
  const viewer = await getViewer();
  const p = await getListingByCode(code, viewer);
  if (!p) return null;
  const [{ profile, agent }, favs, commission] = await Promise.all([getListingContactCard(p), favoriteIds(viewer?.id), commissionForViewer(viewer, p.id)]);
  const view = toListingView(p);
  const photos = p.property_media.filter((m) => m.kind !== "video").sort((a, b) => a.sort_order - b.sort_order).map(mediaUrl);
  const ld = p.land_details ?? {};
  const sale = p.sale_price != null ? Number(p.sale_price) : null;
  const rent = p.rent_price != null ? Number(p.rent_price) : null;
  const photoCount = p.property_media.filter((m) => m.kind === "image").length;

  const specs =
    p.category === "land"
      ? []
      : [
          { label: "ขนาดพื้นที่ใช้สอย", value: p.usable_area_sqm != null ? `${Number(p.usable_area_sqm)} ตร.ม.` : "-" },
          { label: "จำนวนห้องนอน", value: p.bedrooms == null ? "-" : p.bedrooms === 0 ? "Studio" : `${p.bedrooms} ห้องนอน` },
          { label: p.floor != null ? "ชั้นที่อยู่" : "ห้องน้ำ", value: p.floor != null ? `ชั้น ${p.floor}${p.total_floors ? `/${p.total_floors}` : ""}` : dash(p.bathrooms && `${p.bathrooms} ห้องน้ำ`) },
          { label: "ทิศระเบียงห้อง", value: p.direction ? (DIRECTION_LABEL[p.direction] ?? p.direction) : "-" },
          { label: "เฟอร์นิเจอร์", value: p.furnishing ? FURNISHING_LABEL[p.furnishing] : "-" },
          { label: "ค่าส่วนกลาง", value: p.maintenance_fee != null ? `฿${Number(p.maintenance_fee).toLocaleString("en-US")}/เดือน` : "-" },
          { label: "พร้อมเข้าอยู่", value: view.readyToMove ? "ทันที" : new Date(p.available_from!).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) },
          { label: "ประเภทการขาย", value: p.agent_id ? "ผ่าน Agency" : "เจ้าของขายตรง" },
        ];
  const rentTerms = [
    p.deposit_months != null && `เงินประกัน ${p.deposit_months} เดือน`,
    p.advance_months != null && `จ่ายล่วงหน้า ${p.advance_months} เดือน`,
    p.min_lease_months != null && `สัญญาขั้นต่ำ ${p.min_lease_months} เดือน`,
    p.pets_allowed != null && (p.pets_allowed ? "เลี้ยงสัตว์ได้" : "ไม่อนุญาตสัตว์เลี้ยง"),
  ].filter((x): x is string => Boolean(x));

  // What the "% Match" on the card is made of (see matchScore in lib/listing-view).
  const matchFactors = [
    { label: "ตรวจสอบกรรมสิทธิ์ (Verified)", score: p.is_verified ? "ผ่านการตรวจสอบ (100%)" : "ยังไม่ตรวจสอบ" },
    { label: "รูปภาพประกอบ (Photos)", score: `${photoCount} รูป (${Math.min(100, photoCount * 25)}%)` },
    { label: "รายละเอียดประกาศ (Description)", score: p.description && p.description.length > 80 ? "ครบถ้วน (100%)" : "ข้อมูลน้อย (50%)" },
    { label: "พิกัดทำเล (Location)", score: p.lat != null ? "ระบุพิกัดแล้ว (100%)" : "ยังไม่ระบุพิกัด" },
    { label: "สิ่งอำนวยความสะดวก (Amenities)", score: `${p.amenities.length} รายการ` },
  ];

  return {
    view,
    images: photos.length ? photos : [view.image],
    description: p.description,
    address: [p.address_line, p.subdistrict, p.district, p.province].filter(Boolean).join(", "),
    status: p.status,
    statusLabel: STATUS_LABEL[p.status],
    rejectionReason: p.rejection_reason,
    accepting: p.status === "active" || p.status === "reserved",
    isMine: Boolean(viewer && (viewer.id === p.owner_id || viewer.id === p.agent_id)),
    salePrice: sale,
    specs,
    rentTerms,
    land:
      p.category === "land"
        ? { roadType: ld.road_type ?? null, shape: ld.shape ?? null, utilities: ld.utilities ?? [], suitableFor: ld.suitable_for ?? [] }
        : null,
    contact: {
      name: profile?.display_name ?? "ผู้ขาย",
      avatar: profile?.avatar_url ?? null,
      kyc: Boolean(profile?.is_kyc_verified),
      isAgent: Boolean(p.agent_id),
      agentCode: agent?.agent_code ?? null,
      company: agent?.company_name ?? null,
      licenseVerified: Boolean(agent?.license_verified),
      closedDeals: agent?.closed_deals ?? 0,
      rating: Number(agent?.rating_avg ?? 0),
      ratingCount: agent?.rating_count ?? 0,
    },
    pod: p.pod?.status === "verified" ? { name: p.pod.name, trust: p.pod.trust_score } : null,
    commission: commission ? { rate: commission.sale_rate_pct ?? commission.rent_month1_rate_pct ?? null, via: commission.via } : null,
    yieldPct: sale && rent ? Math.round(((rent * 12) / sale) * 1000) / 10 : null,
    matchFactors,
    viewerRole: viewer?.profile.primary_role ?? null,
    signedIn: Boolean(viewer),
    saved: favs.has(p.id),
  };
});
