import "server-only";
import { and, count, desc, eq, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { buyer_requests, profiles, properties } from "@/server/db/schema";
import { AppError, forbidden, notFound, requireActive, type Actor } from "./core";
import type { PropertyCategory } from "@/lib/types";

export type BuyerRequestInput = {
  deal: "buy" | "rent";
  category: PropertyCategory;
  province: string;
  area: string;
  max_budget: number;
  min_size?: number | null;
  criteria?: string | null;
};
type RequestRow = typeof buyer_requests.$inferSelect;

const MAX_ACTIVE = 10;

/** Active listings that fit a request: same category and province, within budget, for the right deal. */
function matchWhere(r: Pick<RequestRow, "deal" | "category" | "province" | "max_budget">) {
  const price = r.deal === "rent" ? properties.rent_price : properties.sale_price;
  return and(
    eq(properties.status, "active"),
    eq(properties.category, r.category),
    eq(properties.province, r.province),
    inArray(properties.listing_type, r.deal === "rent" ? ["rent", "sale_or_rent"] : ["sale", "sale_or_rent"]),
    lte(price, r.max_budget),
  );
}

export async function createBuyerRequest(actor: Actor, v: BuyerRequestInput) {
  requireActive(actor);
  if (v.max_budget <= 0) throw new AppError("ระบุงบประมาณ");
  const [{ n }] = await db.select({ n: count() }).from(buyer_requests).where(and(eq(buyer_requests.user_id, actor.id), eq(buyer_requests.status, "active")));
  if (Number(n) >= MAX_ACTIVE) throw new AppError(`โพสต์หาทรัพย์ได้สูงสุด ${MAX_ACTIVE} รายการพร้อมกัน`);
  const id = crypto.randomUUID();
  await db.insert(buyer_requests).values({ id, user_id: actor.id, ...v, min_size: v.min_size ?? null, criteria: v.criteria ?? null });
  return id;
}

/** The actor's own requests with how many live listings currently match each. */
export async function myBuyerRequests(actor: Actor) {
  const rows = await db.select().from(buyer_requests).where(eq(buyer_requests.user_id, actor.id)).orderBy(desc(buyer_requests.created_at)).limit(50);
  return Promise.all(rows.map(async (r) => {
    const [{ n }] = await db.select({ n: count() }).from(properties).where(and(matchWhere(r), ne(properties.owner_id, actor.id)));
    return { ...r, matched: Number(n) };
  }));
}

/** Codes of the listings matching one of the actor's requests. */
export async function matchesForRequest(actor: Actor, id: string) {
  const [r] = await db.select().from(buyer_requests).where(eq(buyer_requests.id, id)).limit(1);
  if (!r) throw notFound();
  if (r.user_id !== actor.id) throw forbidden();
  return db.select({ code: properties.code }).from(properties).where(and(matchWhere(r), ne(properties.owner_id, actor.id))).limit(50);
}

export async function closeBuyerRequest(actor: Actor, id: string) {
  requireActive(actor);
  const [r] = await db.select({ user_id: buyer_requests.user_id }).from(buyer_requests).where(eq(buyer_requests.id, id)).limit(1);
  if (!r) throw notFound();
  if (r.user_id !== actor.id) throw forbidden();
  await db.update(buyer_requests).set({ status: "closed" }).where(eq(buyer_requests.id, id));
}

/** Open requests for sellers and agents to answer (name only, contact goes through chat). */
export async function openBuyerRequests(actor: Actor, limit = 50) {
  requireActive(actor);
  return db.select({ r: buyer_requests, name: profiles.display_name }).from(buyer_requests)
    .innerJoin(profiles, eq(profiles.id, buyer_requests.user_id))
    .where(and(eq(buyer_requests.status, "active"), ne(buyer_requests.user_id, actor.id)))
    .orderBy(desc(buyer_requests.created_at)).limit(limit)
    .then((rows) => rows.map((x) => ({ ...x.r, poster_name: x.name })));
}

