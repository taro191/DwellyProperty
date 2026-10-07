"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { attempt, fail, formObject, invalid } from "@/lib/action-utils";
import * as listings from "@/server/services/listings";
import * as trust from "@/server/services/trust";
import { removeFiles } from "@/server/storage";
import type { ActionResult, PropertyStatus } from "@/lib/types";

const optNum = (min = 0, max = 1e12, msg = "ตัวเลขไม่ถูกต้อง") => z.coerce.number(msg).min(min, msg).max(max, msg).optional();
const optInt = (min: number, max: number) => z.coerce.number().int("ต้องเป็นจำนวนเต็ม").min(min).max(max).optional();
const optText = (max: number) => z.string().trim().max(max).optional();

const listingSchema = z
  .object({
    listing_type: z.enum(["sale", "rent", "sale_or_rent"], "เลือกประเภทประกาศ"),
    category: z.enum(["condo", "house", "townhome", "land", "apartment", "commercial"], "เลือกประเภททรัพย์"),
    title: z.string().trim().min(10, "หัวข้อประกาศอย่างน้อย 10 ตัวอักษร").max(150, "หัวข้อยาวเกิน 150 ตัวอักษร"),
    description: optText(10000),
    project_name: optText(150),
    sale_price: optNum(1, 1e11, "ราคาขายไม่ถูกต้อง"),
    rent_price: optNum(1, 1e9, "ค่าเช่าไม่ถูกต้อง"),
    price_negotiable: z.literal("on").optional(),
    usable_area_sqm: optNum(1, 1e6, "พื้นที่ไม่ถูกต้อง"),
    land_area_sqwa: optNum(1, 1e7, "ขนาดที่ดินไม่ถูกต้อง"),
    bedrooms: optInt(0, 50),
    bathrooms: optInt(0, 50),
    floor: optInt(-5, 200),
    total_floors: optInt(1, 200),
    direction: z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]).optional(),
    furnishing: z.enum(["unfurnished", "partial", "full"]).optional(),
    maintenance_fee: optNum(0, 1e7),
    year_built: optInt(1900, 2100),
    available_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    deposit_months: optNum(0, 24),
    advance_months: optNum(0, 24),
    min_lease_months: optInt(1, 120),
    pets_allowed: z.enum(["yes", "no"]).optional(),
    deed_type: optText(100),
    zoning: optText(100),
    road_frontage_m: optNum(0, 10000),
    tags: optText(500),
    amenities: z.array(z.string().max(50)).max(30).default([]),
    province: z.string().trim().min(2, "เลือกจังหวัด").max(80),
    district: optText(80),
    subdistrict: optText(80),
    postal_code: z.string().regex(/^\d{5}$/, "รหัสไปรษณีย์ 5 หลัก").optional(),
    address_line: optText(300),
    lat: optNum(-90, 90),
    lng: optNum(-180, 180),
    show_exact_location: z.literal("on").optional(),
    zone_id: z.uuid().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.listing_type !== "rent" && v.sale_price == null)
      ctx.addIssue({ code: "custom", path: ["sale_price"], message: "กรุณาระบุราคาขาย" });
    if (v.listing_type !== "sale" && v.rent_price == null)
      ctx.addIssue({ code: "custom", path: ["rent_price"], message: "กรุณาระบุค่าเช่าต่อเดือน" });
    if (v.category === "land" && v.land_area_sqwa == null)
      ctx.addIssue({ code: "custom", path: ["land_area_sqwa"], message: "กรุณาระบุขนาดที่ดิน (ตร.ว.)" });
    if (v.category !== "land" && v.usable_area_sqm == null)
      ctx.addIssue({ code: "custom", path: ["usable_area_sqm"], message: "กรุณาระบุพื้นที่ใช้สอย" });
  });

function toRow(v: z.infer<typeof listingSchema>) {
  const isLand = v.category === "land";
  const rentable = v.listing_type !== "sale";
  return {
    listing_type: v.listing_type,
    category: v.category,
    title: v.title,
    description: v.description ?? null,
    project_name: v.project_name ?? null,
    sale_price: v.listing_type === "rent" ? null : v.sale_price,
    rent_price: v.listing_type === "sale" ? null : v.rent_price,
    price_negotiable: v.price_negotiable === "on",
    usable_area_sqm: v.usable_area_sqm ?? null,
    land_area_sqwa: v.land_area_sqwa ?? null,
    bedrooms: isLand ? null : (v.bedrooms ?? null),
    bathrooms: isLand ? null : (v.bathrooms ?? null),
    floor: isLand ? null : (v.floor ?? null),
    total_floors: isLand ? null : (v.total_floors ?? null),
    direction: v.direction ?? null,
    furnishing: isLand ? null : (v.furnishing ?? null),
    maintenance_fee: v.maintenance_fee ?? null,
    year_built: isLand ? null : (v.year_built ?? null),
    available_from: v.available_from ?? null,
    deposit_months: rentable ? (v.deposit_months ?? null) : null,
    advance_months: rentable ? (v.advance_months ?? null) : null,
    min_lease_months: rentable ? (v.min_lease_months ?? null) : null,
    pets_allowed: rentable && v.pets_allowed ? v.pets_allowed === "yes" : null,
    land_details: isLand
      ? Object.fromEntries(Object.entries({ deed_type: v.deed_type, zoning: v.zoning, road_frontage_m: v.road_frontage_m }).filter(([, x]) => x != null))
      : {},
    tags: (v.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 15),
    amenities: v.amenities,
    province: v.province,
    district: v.district ?? null,
    subdistrict: v.subdistrict ?? null,
    postal_code: v.postal_code ?? null,
    address_line: v.address_line ?? null,
    lat: v.lat != null && v.lng != null ? v.lat : null,
    lng: v.lat != null && v.lng != null ? v.lng : null,
    show_exact_location: v.show_exact_location === "on",
    zone_id: v.zone_id ?? null,
  };
}

export async function createListing(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/listings/new");
  const parsed = listingSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  let id: string;
  try {
    ({ id } = await listings.createListing(viewer, toRow(parsed.data)));
  } catch (e) {
    return fail(e);
  }
  redirect(`/dashboard/listings/${id}?created=1#photos`);
}

export async function updateListing(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/listings");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, error: "invalid" };
  const parsed = listingSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const r = await attempt(() => listings.updateListing(viewer, id.data, toRow(parsed.data)), "บันทึกการแก้ไขแล้ว");
  revalidatePath(`/dashboard/listings/${id.data}`);
  return r;
}

const STATUS_TARGETS = ["pending_review", "draft", "reserved", "active", "sold", "rented", "archived"] as const;

export async function changeListingStatus(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/listings");
  const id = z.uuid().safeParse(fd.get("id"));
  const status = z.enum(STATUS_TARGETS).safeParse(fd.get("status"));
  if (!id.success || !status.success) return { ok: false, error: "invalid" };
  const r = await attempt(
    () => listings.changeListingStatus(viewer, id.data, status.data as PropertyStatus),
    status.data === "pending_review" ? "ส่งให้ทีมงานตรวจสอบแล้ว ปกติใช้เวลาไม่เกิน 24 ชั่วโมง" : "อัปเดตสถานะแล้ว",
  );
  revalidatePath(`/dashboard/listings/${id.data}`);
  revalidatePath("/dashboard/listings");
  return r;
}

export async function deleteListing(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/listings");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, error: "invalid" };
  try {
    const paths = await listings.deleteListing(viewer, id.data);
    await removeFiles("property-media", paths.filter((p) => p.startsWith(viewer.id + "/")));
  } catch (e) {
    return fail(e);
  }
  redirect("/dashboard/listings");
}

// Media: the browser uploads to /api/upload, then records the returned path here.
export async function addMedia(propertyId: string, storagePath: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!z.uuid().safeParse(propertyId).success) return { ok: false, error: "invalid" };
  const r = await attempt(() => listings.addMedia(viewer, propertyId, storagePath));
  if (!r.ok) await removeFiles("property-media", [storagePath].filter((p) => p.startsWith(`${viewer.id}/${propertyId}/`)));
  revalidatePath(`/dashboard/listings/${propertyId}`);
  return r;
}

export async function removeMedia(mediaId: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!z.uuid().safeParse(mediaId).success) return { ok: false, error: "invalid" };
  try {
    const m = await listings.removeMedia(viewer, mediaId);
    if (m.storage_path) await removeFiles("property-media", [m.storage_path]);
    revalidatePath(`/dashboard/listings/${m.property_id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function makeCover(mediaId: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!z.uuid().safeParse(mediaId).success) return { ok: false, error: "invalid" };
  try {
    const propertyId = await listings.makeCover(viewer, mediaId);
    revalidatePath(`/dashboard/listings/${propertyId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Dwelly Commission (Co-Agent) programme per listing
// ---------------------------------------------------------------------------
const pct = (max: number) => z.coerce.number("ตัวเลขไม่ถูกต้อง").min(0).max(max).optional();
const commissionSchema = z.object({
  property_id: z.uuid(),
  enabled: z.literal("on").optional(),
  sale_rate_pct: pct(10),
  rent_month1_rate_pct: pct(300),
  rent_month2_rate_pct: pct(300),
  rent_month3_plus_rate_pct: pct(300),
  renewal_rate_pct: pct(300),
  terms: optText(4000),
});

export async function saveCommission(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = commissionSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { enabled, ...v } = parsed.data;
  const r = await attempt(() => trust.saveCommission(viewer, {
    property_id: v.property_id,
    enabled: enabled === "on",
    sale_rate_pct: v.sale_rate_pct ?? null,
    rent_month1_rate_pct: v.rent_month1_rate_pct ?? null,
    rent_month2_rate_pct: v.rent_month2_rate_pct ?? null,
    rent_month3_plus_rate_pct: v.rent_month3_plus_rate_pct ?? null,
    renewal_rate_pct: v.renewal_rate_pct ?? null,
    terms: v.terms ?? null,
  }), "บันทึกเงื่อนไข Co-Agent แล้ว (เห็นเฉพาะนายหน้าที่ได้รับอนุญาต)");
  revalidatePath(`/dashboard/listings/${v.property_id}`);
  return r;
}

export async function decideCommissionAccess(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer();
  const id = z.uuid().safeParse(fd.get("id"));
  const status = z.enum(["approved", "rejected", "revoked"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return { ok: false, error: "invalid" };
  try {
    const propertyId = await trust.decideCommissionAccess(viewer, id.data, status.data);
    if (propertyId) revalidatePath(`/dashboard/listings/${propertyId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
