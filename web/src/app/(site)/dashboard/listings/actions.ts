"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, invalid } from "@/lib/action-utils";
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...toRow(parsed.data), owner_id: viewer.id, status: "draft" })
    .select("id")
    .single();
  if (error) return dbError(error);
  // Make sure the owner role exists so the seller tools show up.
  await supabase.from("user_roles").upsert({ user_id: viewer.id, role: "owner" }, { ignoreDuplicates: true });
  redirect(`/dashboard/listings/${data.id}?created=1#photos`);
}

export async function updateListing(fd: FormData): Promise<ActionResult> {
  await requireViewer("/dashboard/listings");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, error: "invalid" };
  const parsed = listingSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error, count } = await supabase.from("properties").update(toRow(parsed.data), { count: "exact" }).eq("id", id.data);
  if (error) return dbError(error);
  if (!count) return { ok: false, error: "ไม่พบประกาศ หรือคุณไม่มีสิทธิ์แก้ไข" };
  revalidatePath(`/dashboard/listings/${id.data}`);
  return { ok: true, message: "บันทึกการแก้ไขแล้ว" };
}

const STATUS_TARGETS: PropertyStatus[] = ["pending_review", "draft", "reserved", "active", "sold", "rented", "archived"];

export async function changeListingStatus(fd: FormData): Promise<ActionResult> {
  await requireViewer("/dashboard/listings");
  const id = z.uuid().safeParse(fd.get("id"));
  const status = z.enum(STATUS_TARGETS as [PropertyStatus, ...PropertyStatus[]]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();

  if (status.data === "pending_review") {
    const { count } = await supabase.from("property_media").select("id", { count: "exact", head: true }).eq("property_id", id.data);
    if (!count) return { ok: false, error: "กรุณาเพิ่มรูปอย่างน้อย 1 รูปก่อนส่งตรวจ" };
  }
  const { error } = await supabase.from("properties").update({ status: status.data }).eq("id", id.data);
  if (error) return dbError(error);
  revalidatePath(`/dashboard/listings/${id.data}`);
  revalidatePath("/dashboard/listings");
  return {
    ok: true,
    message: status.data === "pending_review" ? "ส่งให้ทีมงานตรวจสอบแล้ว ปกติใช้เวลาไม่เกิน 24 ชั่วโมง" : "อัปเดตสถานะแล้ว",
  };
}

export async function deleteListing(fd: FormData): Promise<ActionResult> {
  const viewer = await requireViewer("/dashboard/listings");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: media } = await supabase.from("property_media").select("storage_path").eq("property_id", id.data);
  const { error, count } = await supabase.from("properties").delete({ count: "exact" }).eq("id", id.data);
  if (error) return dbError(error);
  if (!count) return { ok: false, error: "ลบได้เฉพาะแบบร่างหรือประกาศที่ไม่ผ่านการตรวจ" };
  const paths = (media ?? []).map((m) => m.storage_path).filter((p): p is string => Boolean(p?.startsWith(viewer.id + "/")));
  if (paths.length) await supabase.storage.from("property-media").remove(paths);
  redirect("/dashboard/listings");
}

// ---------------------------------------------------------------------------
// Media (files are uploaded from the browser straight to Storage; we record rows)
// ---------------------------------------------------------------------------
export async function addMedia(propertyId: string, storagePath: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!z.uuid().safeParse(propertyId).success || !storagePath.startsWith(`${viewer.id}/${propertyId}/`)) {
    return { ok: false, error: "invalid" };
  }
  const supabase = await createClient();
  const { count } = await supabase.from("property_media").select("id", { count: "exact", head: true }).eq("property_id", propertyId);
  if ((count ?? 0) >= 30) return { ok: false, error: "เพิ่มรูปได้สูงสุด 30 รูป" };
  const { error } = await supabase.from("property_media").insert({
    property_id: propertyId, storage_path: storagePath, kind: "image", sort_order: count ?? 0,
  });
  if (error) return dbError(error);
  revalidatePath(`/dashboard/listings/${propertyId}`);
  return { ok: true };
}

export async function removeMedia(mediaId: string): Promise<ActionResult> {
  await requireViewer();
  if (!z.uuid().safeParse(mediaId).success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: row } = await supabase.from("property_media").select("property_id, storage_path").eq("id", mediaId).single();
  if (!row) return { ok: false, error: "ไม่พบรูป" };
  const { error } = await supabase.from("property_media").delete().eq("id", mediaId);
  if (error) return dbError(error);
  if (row.storage_path) await supabase.storage.from("property-media").remove([row.storage_path]);
  revalidatePath(`/dashboard/listings/${row.property_id}`);
  return { ok: true };
}

export async function makeCover(mediaId: string): Promise<ActionResult> {
  await requireViewer();
  if (!z.uuid().safeParse(mediaId).success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: row } = await supabase.from("property_media").select("property_id").eq("id", mediaId).single();
  if (!row) return { ok: false, error: "ไม่พบรูป" };
  const { data: all } = await supabase.from("property_media").select("id").eq("property_id", row.property_id).order("sort_order");
  const ordered = [mediaId, ...(all ?? []).map((m) => m.id).filter((id) => id !== mediaId)];
  const results = await Promise.all(ordered.map((id, i) => supabase.from("property_media").update({ sort_order: i }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed) return dbError(failed.error);
  revalidatePath(`/dashboard/listings/${row.property_id}`);
  return { ok: true };
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
  await requireViewer();
  const parsed = commissionSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { enabled, ...v } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("commission_programs").upsert({
    ...v,
    enabled: enabled === "on",
    sale_rate_pct: v.sale_rate_pct ?? null,
    rent_month1_rate_pct: v.rent_month1_rate_pct ?? null,
    rent_month2_rate_pct: v.rent_month2_rate_pct ?? null,
    rent_month3_plus_rate_pct: v.rent_month3_plus_rate_pct ?? null,
    renewal_rate_pct: v.renewal_rate_pct ?? null,
    terms: v.terms ?? null,
  });
  if (error) return dbError(error);
  revalidatePath(`/dashboard/listings/${v.property_id}`);
  return { ok: true, message: "บันทึกเงื่อนไข Co-Agent แล้ว (เห็นเฉพาะนายหน้าที่ได้รับอนุญาต)" };
}

export async function decideCommissionAccess(fd: FormData): Promise<ActionResult> {
  await requireViewer();
  const id = z.uuid().safeParse(fd.get("id"));
  const status = z.enum(["approved", "rejected", "revoked"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("commission_access_requests").update({ status: status.data }).eq("id", id.data).select("property_id").single();
  if (error) return dbError(error);
  revalidatePath(`/dashboard/listings/${data.property_id}`);
  return { ok: true };
}
