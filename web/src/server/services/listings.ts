import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, like, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db";
import {
  agency_pods, agent_profiles, favorites, profiles, properties, property_events, property_media, user_roles, zones,
} from "@/server/db/schema";
import { AppError, DAY, audit, forbidden, isStaff, nextCounter, notFound, notify, requireActive, type Actor, type Tx } from "./core";
import type { PropertyCategory, PropertyMedia, PropertyStatus, PropertyWithMedia } from "@/lib/types";
import { mediaUrl } from "@/lib/format";

export const PUBLIC_STATUSES: PropertyStatus[] = ["active", "reserved", "sold", "rented"];
export const PAGE_SIZE = 18;

type PropertyRow = typeof properties.$inferSelect;
export type ListingInput = Omit<typeof properties.$inferInsert,
  "id" | "code" | "owner_id" | "status" | "is_verified" | "verified_at" | "featured_until" | "views_count" | "saves_count"
  | "inquiries_count" | "published_at" | "expires_at" | "created_at" | "updated_at" | "rejection_reason">;

/** Attach media (sorted) to listing rows. */
export async function withMedia(rows: PropertyRow[], tx: Tx = db): Promise<PropertyWithMedia[]> {
  if (rows.length === 0) return [];
  const media = await tx.select().from(property_media)
    .where(inArray(property_media.property_id, rows.map((r) => r.id)))
    .orderBy(asc(property_media.sort_order));
  const byProp = new Map<string, PropertyMedia[]>();
  for (const m of media) {
    const list = byProp.get(m.property_id) ?? [];
    list.push(m as PropertyMedia);
    byProp.set(m.property_id, list);
  }
  return rows.map((r) => ({ ...(r as unknown as PropertyWithMedia), property_media: byProp.get(r.id) ?? [] }));
}

export function canManage(actor: Actor | null | undefined, p: Pick<PropertyRow, "owner_id" | "agent_id">) {
  return Boolean(actor && (actor.id === p.owner_id || actor.id === p.agent_id));
}

function canView(actor: Actor | null | undefined, p: PropertyRow) {
  return PUBLIC_STATUSES.includes(p.status) || canManage(actor, p) || isStaff(actor);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
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
  bbox?: [number, number, number, number];
}

export async function searchListings(f: SearchFilters, opts: { limit?: number; mapOnly?: boolean } = {}) {
  const limit = opts.limit ?? PAGE_SIZE;
  const priceCol = f.type === "rent" ? properties.rent_price : properties.sale_price;
  const where: SQL[] = [inArray(properties.status, ["active", "reserved"])];

  if (f.q) {
    const term = `%${f.q.replace(/[%_\\]/g, "")}%`;
    where.push(or(like(properties.title, term), like(properties.project_name, term), like(properties.district, term), like(properties.address_line, term))!);
  }
  if (f.type === "sale") where.push(inArray(properties.listing_type, ["sale", "sale_or_rent"]));
  if (f.type === "rent") where.push(inArray(properties.listing_type, ["rent", "sale_or_rent"]));
  if (f.category) where.push(eq(properties.category, f.category));
  if (f.province) where.push(eq(properties.province, f.province));
  if (f.zone) {
    const [z] = await db.select({ id: zones.id }).from(zones).where(eq(zones.slug, f.zone)).limit(1);
    where.push(eq(properties.zone_id, z?.id ?? "none"));
  }
  if (f.min != null) where.push(gte(priceCol, f.min));
  if (f.max != null) where.push(lte(priceCol, f.max));
  if (f.beds != null) where.push(gte(properties.bedrooms, f.beds));
  if (f.verified) where.push(eq(properties.is_verified, true));
  if (f.pets) where.push(eq(properties.pets_allowed, true));
  if (f.bbox) {
    const [s, w, n, e] = f.bbox;
    where.push(gte(properties.lat, s), lte(properties.lat, n), gte(properties.lng, w), lte(properties.lng, e));
  }
  if (opts.mapOnly) where.push(isNotNull(properties.lat));

  const order =
    f.sort === "newest" ? [desc(properties.published_at)]
    : f.sort === "price_asc" ? [sql`${priceCol} is null`, asc(priceCol)]
    : f.sort === "price_desc" ? [desc(priceCol)]
    : [desc(sql`coalesce(${properties.featured_until} > utc_timestamp(3), 0)`), desc(properties.is_verified), desc(properties.published_at)];

  const cond = and(...where);
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(properties).where(cond).orderBy(...order).limit(limit).offset(((f.page ?? 1) - 1) * limit),
    db.select({ total: sql<number>`count(*)` }).from(properties).where(cond),
  ]);
  return { items: await withMedia(rows), total: Number(total) };
}

export async function featuredListings(limit = 6) {
  const rows = await db.select().from(properties)
    .where(and(eq(properties.status, "active"), gt(properties.featured_until, new Date().toISOString())))
    .orderBy(desc(properties.featured_until)).limit(limit);
  return withMedia(rows);
}

export async function similarListings(p: PropertyRow, limit = 3) {
  const rows = await db.select().from(properties)
    .where(and(eq(properties.status, "active"), eq(properties.category, p.category), eq(properties.province, p.province), ne(properties.id, p.id)))
    .orderBy(desc(properties.published_at)).limit(limit);
  return withMedia(rows);
}

// ---------------------------------------------------------------------------
// Reads with visibility rules
// ---------------------------------------------------------------------------
export async function getListingByCode(code: string, actor: Actor | null) {
  const [p] = await db.select().from(properties).where(eq(properties.code, code.toUpperCase())).limit(1);
  if (!p || !canView(actor, p)) return null;
  const [withM] = await withMedia([p]);
  const [[zone], [pod]] = await Promise.all([
    p.zone_id ? db.select().from(zones).where(eq(zones.id, p.zone_id)).limit(1) : Promise.resolve([]),
    p.pod_id ? db.select().from(agency_pods).where(eq(agency_pods.id, p.pod_id)).limit(1) : Promise.resolve([]),
  ]);
  return { ...withM, zone: zone ?? null, pod: pod ?? null };
}

/** Public card for whoever answers for the listing (agent if assigned, else owner). */
export async function getListingContactCard(p: Pick<PropertyRow, "owner_id" | "agent_id">) {
  const contactId = p.agent_id ?? p.owner_id;
  const [[profile], [agent]] = await Promise.all([
    db.select({ id: profiles.id, display_name: profiles.display_name, avatar_url: profiles.avatar_url, is_kyc_verified: profiles.is_kyc_verified })
      .from(profiles).where(eq(profiles.id, contactId)).limit(1),
    p.agent_id ? db.select().from(agent_profiles).where(eq(agent_profiles.user_id, p.agent_id)).limit(1) : Promise.resolve([]),
  ]);
  return { profile: profile ?? null, agent: agent ?? null };
}

/** Listing for the owner/agent management screens. */
export async function getManagedListing(actor: Actor, id: string) {
  const [p] = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  if (!p || !canManage(actor, p)) return null;
  return (await withMedia([p]))[0];
}

export async function listManagedListings(actor: Actor) {
  const rows = await db.select().from(properties)
    .where(or(eq(properties.owner_id, actor.id), eq(properties.agent_id, actor.id)))
    .orderBy(desc(properties.updated_at));
  return withMedia(rows);
}

// ---------------------------------------------------------------------------
// Writes (owner / agent)
// ---------------------------------------------------------------------------
async function loadManaged(tx: Tx, actor: Actor, id: string) {
  const [p] = await tx.select().from(properties).where(eq(properties.id, id)).limit(1).for("update");
  if (!p) throw notFound("ไม่พบประกาศ");
  if (!canManage(actor, p)) throw forbidden("คุณไม่มีสิทธิ์จัดการประกาศนี้");
  return p;
}

export async function createListing(actor: Actor, input: ListingInput) {
  requireActive(actor);
  return db.transaction(async (tx) => {
    const n = await nextCounter(tx, "property_code", 1001);
    const code = `DW${String(n).padStart(6, "0")}`;
    const id = crypto.randomUUID();
    await tx.insert(properties).values({ ...input, id, code, owner_id: actor.id, agent_id: null, status: "draft" });
    await tx.insert(user_roles).values({ user_id: actor.id, role: "owner" }).onDuplicateKeyUpdate({ set: { role: "owner" } });
    return { id, code };
  });
}

export async function updateListing(actor: Actor, id: string, input: ListingInput) {
  requireActive(actor);
  await db.transaction(async (tx) => {
    await loadManaged(tx, actor, id);
    // Owners edit content only; verification, status, counters and promotion stay untouched.
    const { agent_id: _ignored, ...content } = input as ListingInput & { agent_id?: string };
    void _ignored;
    await tx.update(properties).set(content).where(eq(properties.id, id));
  });
}

const OWNER_TRANSITIONS: Partial<Record<PropertyStatus, PropertyStatus[]>> = {
  draft: ["pending_review", "archived"],
  rejected: ["pending_review", "archived"],
  pending_review: ["draft", "archived"],
  active: ["reserved", "sold", "rented", "archived"],
  reserved: ["active", "sold", "rented", "archived"],
  expired: ["pending_review", "archived"],
  sold: ["pending_review", "archived"],
  rented: ["pending_review", "archived"],
  archived: ["pending_review"],
};

export async function changeListingStatus(actor: Actor, id: string, to: PropertyStatus) {
  requireActive(actor);
  await db.transaction(async (tx) => {
    const p = await loadManaged(tx, actor, id);
    if (p.status === to) return;
    if (!OWNER_TRANSITIONS[p.status]?.includes(to)) throw new AppError("ไม่สามารถเปลี่ยนสถานะประกาศแบบนี้ได้");
    if (to === "pending_review") {
      const [{ n }] = await tx.select({ n: sql<number>`count(*)` }).from(property_media).where(eq(property_media.property_id, id));
      if (Number(n) === 0) throw new AppError("กรุณาเพิ่มรูปอย่างน้อย 1 รูปก่อนส่งตรวจ");
    }
    await tx.update(properties)
      .set({ status: to, ...(to === "pending_review" ? { rejection_reason: null } : {}) })
      .where(eq(properties.id, id));
  });
}

export async function deleteListing(actor: Actor, id: string) {
  requireActive(actor);
  return db.transaction(async (tx) => {
    const p = await loadManaged(tx, actor, id);
    if (p.owner_id !== actor.id || !["draft", "rejected"].includes(p.status)) {
      throw new AppError("ลบได้เฉพาะแบบร่างหรือประกาศที่ไม่ผ่านการตรวจ");
    }
    const media = await tx.select({ path: property_media.storage_path }).from(property_media).where(eq(property_media.property_id, id));
    await tx.delete(properties).where(eq(properties.id, id));
    return media.map((m) => m.path).filter((x): x is string => Boolean(x));
  });
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
export async function addMedia(actor: Actor, propertyId: string, storagePath: string) {
  requireActive(actor);
  if (!storagePath.startsWith(`${actor.id}/${propertyId}/`)) throw forbidden();
  await db.transaction(async (tx) => {
    await loadManaged(tx, actor, propertyId);
    const [{ n }] = await tx.select({ n: sql<number>`count(*)` }).from(property_media).where(eq(property_media.property_id, propertyId));
    if (Number(n) >= 30) throw new AppError("เพิ่มรูปได้สูงสุด 30 รูป");
    await tx.insert(property_media).values({ property_id: propertyId, storage_path: storagePath, kind: "image", sort_order: Number(n) });
  });
}

export async function removeMedia(actor: Actor, mediaId: string) {
  requireActive(actor);
  return db.transaction(async (tx) => {
    const [m] = await tx.select().from(property_media).where(eq(property_media.id, mediaId)).limit(1);
    if (!m) throw notFound("ไม่พบรูป");
    if (!isStaff(actor, ["moderator"])) await loadManaged(tx, actor, m.property_id);
    await tx.delete(property_media).where(eq(property_media.id, mediaId));
    return m;
  });
}

export async function makeCover(actor: Actor, mediaId: string) {
  requireActive(actor);
  return db.transaction(async (tx) => {
    const [m] = await tx.select().from(property_media).where(eq(property_media.id, mediaId)).limit(1);
    if (!m) throw notFound("ไม่พบรูป");
    await loadManaged(tx, actor, m.property_id);
    const all = await tx.select({ id: property_media.id }).from(property_media)
      .where(eq(property_media.property_id, m.property_id)).orderBy(asc(property_media.sort_order));
    const ordered = [mediaId, ...all.map((x) => x.id).filter((x) => x !== mediaId)];
    for (const [i, mid] of ordered.entries()) await tx.update(property_media).set({ sort_order: i }).where(eq(property_media.id, mid));
    return m.property_id;
  });
}

// ---------------------------------------------------------------------------
// Favorites, views, contact
// ---------------------------------------------------------------------------
export async function favoriteIds(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await db.select({ id: favorites.property_id }).from(favorites).where(eq(favorites.user_id, userId));
  return new Set(rows.map((r) => r.id));
}

export async function listFavorites(actor: Actor) {
  const rows = await db.select({ p: properties }).from(favorites)
    .innerJoin(properties, eq(properties.id, favorites.property_id))
    .where(eq(favorites.user_id, actor.id)).orderBy(desc(favorites.created_at));
  return withMedia(rows.map((r) => r.p).filter((p) => PUBLIC_STATUSES.includes(p.status)));
}

export async function setFavorite(actor: Actor, propertyId: string, save: boolean) {
  requireActive(actor);
  await db.transaction(async (tx) => {
    if (save) {
      const [p] = await tx.select({ status: properties.status }).from(properties).where(eq(properties.id, propertyId)).limit(1);
      if (!p || !PUBLIC_STATUSES.includes(p.status)) throw notFound("ไม่พบประกาศ");
      const [res] = await tx.insert(favorites).ignore().values({ user_id: actor.id, property_id: propertyId });
      if (res.affectedRows) await tx.update(properties).set({ saves_count: sql`${properties.saves_count} + 1` }).where(eq(properties.id, propertyId));
    } else {
      const [res] = await tx.delete(favorites).where(and(eq(favorites.user_id, actor.id), eq(favorites.property_id, propertyId)));
      if (res.affectedRows) await tx.update(properties).set({ saves_count: sql`greatest(${properties.saves_count} - 1, 0)` }).where(eq(properties.id, propertyId));
    }
  });
}

/** Count a view; signed-in users count once per hour per listing. */
export async function trackView(propertyId: string, userId: string | null) {
  const [p] = await db.select({ status: properties.status }).from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (p?.status !== "active") return;
  if (userId) {
    const [recent] = await db.select({ id: property_events.id }).from(property_events).where(and(
      eq(property_events.property_id, propertyId), eq(property_events.user_id, userId), eq(property_events.kind, "view"),
      gt(property_events.created_at, new Date(Date.now() - 3_600_000).toISOString()),
    )).limit(1);
    if (recent) return;
  }
  await db.insert(property_events).values({ property_id: propertyId, user_id: userId, kind: "view" });
  await db.update(properties).set({ views_count: sql`${properties.views_count} + 1` }).where(eq(properties.id, propertyId));
}

/** Seller phone/LINE for signed-in users; logged so sellers can see real interest. */
export async function revealContact(actor: Actor, propertyId: string) {
  requireActive(actor);
  const [p] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!p || !["active", "reserved"].includes(p.status)) throw notFound("ประกาศนี้ปิดไปแล้ว");
  await db.insert(property_events).values({ property_id: propertyId, user_id: actor.id, kind: "contact_reveal" });
  const [c] = await db.select({ name: profiles.display_name, phone: profiles.phone, line_id: profiles.line_id })
    .from(profiles).where(eq(profiles.id, p.agent_id ?? p.owner_id)).limit(1);
  if (!c) throw notFound("ไม่พบข้อมูลติดต่อ");
  return c;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
export async function staffGetListing(actor: Actor, id: string) {
  if (!isStaff(actor)) throw forbidden();
  const [p] = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return p ? (await withMedia([p]))[0] : null;
}

export async function staffListListings(actor: Actor, status: PropertyStatus | "all", q: string) {
  if (!isStaff(actor, ["moderator"])) throw forbidden();
  const where: SQL[] = [];
  if (status !== "all") where.push(eq(properties.status, status));
  if (q) where.push(/^DW\d+$/i.test(q) ? eq(properties.code, q.toUpperCase()) : like(properties.title, `%${q.replace(/[%_\\]/g, "")}%`));
  const rows = await db.select({ p: properties, owner_name: profiles.display_name, owner_kyc: profiles.is_kyc_verified })
    .from(properties).innerJoin(profiles, eq(profiles.id, properties.owner_id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(status === "pending_review" ? asc(properties.updated_at) : desc(properties.created_at))
    .limit(100);
  const items = await withMedia(rows.map((r) => r.p));
  return items.map((p, i) => ({ ...p, owner: { display_name: rows[i].owner_name, is_kyc_verified: rows[i].owner_kyc } }));
}

export async function reviewListing(actor: Actor, id: string, approve: boolean, reason?: string | null) {
  if (!isStaff(actor, ["moderator"])) throw forbidden();
  if (!approve && !reason?.trim()) throw new AppError("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
  await db.transaction(async (tx) => {
    const [p] = await tx.select().from(properties).where(eq(properties.id, id)).limit(1).for("update");
    if (!p) throw notFound("ไม่พบประกาศ");
    if (p.status !== "pending_review") throw new AppError("ประกาศนี้ไม่ได้อยู่ในคิวรอตรวจ");
    const now = new Date().toISOString();
    await tx.update(properties).set(approve
      ? { status: "active", rejection_reason: null, published_at: p.published_at ?? now, expires_at: new Date(Date.now() + 90 * DAY).toISOString() }
      : { status: "rejected", rejection_reason: reason ?? null }).where(eq(properties.id, id));
    await notify(tx, p.owner_id, {
      type: "listing", title: approve ? "ประกาศของคุณเผยแพร่แล้ว" : "ประกาศของคุณไม่ผ่านการตรวจสอบ",
      body: approve ? p.title : reason, link: `/dashboard/listings/${p.id}`, entityType: "property", entityId: p.id,
    });
    await audit(tx, actor.id, approve ? "LISTING_APPROVED" : "LISTING_REJECTED", "properties", p.id, `${p.code} ${p.title}`, { reason: reason ?? null });
  });
}

export async function takedownListing(actor: Actor, id: string, reason: string) {
  if (!isStaff(actor, ["moderator"])) throw forbidden();
  if (!reason.trim()) throw new AppError("กรุณาระบุเหตุผล");
  await db.transaction(async (tx) => {
    const [p] = await tx.select().from(properties).where(eq(properties.id, id)).limit(1).for("update");
    if (!p) throw notFound("ไม่พบประกาศ");
    await tx.update(properties).set({ status: "rejected", rejection_reason: reason }).where(eq(properties.id, id));
    await notify(tx, p.owner_id, { type: "listing", title: "ประกาศของคุณถูกระงับ", body: reason, link: `/dashboard/listings/${p.id}`, entityType: "property", entityId: p.id });
    await audit(tx, actor.id, "LISTING_TAKEDOWN", "properties", p.id, `${p.code} ${p.title}`, { reason });
  });
}

export async function featureListing(actor: Actor, id: string, until: string | null) {
  if (!isStaff(actor, ["moderator"])) throw forbidden();
  await db.transaction(async (tx) => {
    await tx.update(properties).set({ featured_until: until }).where(eq(properties.id, id));
    await audit(tx, actor.id, "LISTING_FEATURED", "properties", id, null, { until });
  });
}

/** Cover photo URL per property id (first image by sort order), for lists that only need a thumbnail. */
export async function coverUrls(propertyIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(propertyIds)];
  if (!ids.length) return new Map();
  const media = await db.select().from(property_media)
    .where(and(inArray(property_media.property_id, ids), eq(property_media.kind, "image"))).orderBy(asc(property_media.sort_order));
  const out = new Map<string, string>();
  for (const m of media) if (!out.has(m.property_id)) out.set(m.property_id, mediaUrl(m as PropertyMedia));
  return out;
}
