import "server-only";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { activities, activity_registrations, boost_products, hub_properties, hubs, plans, profiles, properties, zones } from "@/server/db/schema";
import { AppError, notFound, requireActive, type Actor } from "./core";
import { withMedia } from "./listings";
import type { Plan, Zone } from "@/lib/types";

export async function listZones(includeHidden = false): Promise<Zone[]> {
  return db.select().from(zones).where(includeHidden ? undefined : eq(zones.active, true)).orderBy(asc(zones.sort_order));
}

export async function listHubs(statuses: ("draft" | "scheduled" | "live" | "ended")[]) {
  const rows = await db.select({
    h: hubs, count: sql<number>`(select count(*) from ${hub_properties} hp where hp.hub_id = hubs.id)`,
  }).from(hubs).where(inArray(hubs.status, statuses)).orderBy(desc(hubs.starts_at));
  return rows.map((r) => ({ ...r.h, property_count: Number(r.count) }));
}

export async function liveHub() {
  const [h] = await db.select().from(hubs).where(eq(hubs.status, "live")).orderBy(asc(hubs.ends_at)).limit(1);
  return h ?? null;
}

export async function getHub(slug: string) {
  const [h] = await db.select().from(hubs).where(and(eq(hubs.slug, slug), inArray(hubs.status, ["scheduled", "live", "ended"]))).limit(1);
  if (!h) return null;
  const rows = await db.select({ p: properties }).from(hub_properties).innerJoin(properties, eq(properties.id, hub_properties.property_id))
    .where(and(eq(hub_properties.hub_id, h.id), eq(properties.status, "active")));
  return { hub: h, items: await withMedia(rows.map((r) => r.p)) };
}

export async function upcomingActivities(limit = 20) {
  return db.select().from(activities)
    .where(and(eq(activities.status, "published"), gt(activities.starts_at, new Date().toISOString())))
    .orderBy(asc(activities.starts_at)).limit(limit);
}

export async function myRegistrations(userId: string | undefined) {
  if (!userId) return new Set<string>();
  const rows = await db.select({ id: activity_registrations.activity_id }).from(activity_registrations).where(eq(activity_registrations.user_id, userId));
  return new Set(rows.map((r) => r.id));
}

export async function setRegistration(actor: Actor, activityId: string, register: boolean) {
  requireActive(actor);
  if (!register) {
    await db.delete(activity_registrations).where(and(eq(activity_registrations.activity_id, activityId), eq(activity_registrations.user_id, actor.id)));
    return;
  }
  await db.transaction(async (tx) => {
    const [a] = await tx.select().from(activities).where(eq(activities.id, activityId)).limit(1).for("update");
    if (!a) throw notFound();
    if (a.status !== "published" || new Date(a.starts_at) < new Date()) throw new AppError("ปิดรับสมัครแล้ว");
    if (a.seats != null) {
      const [{ n }] = await tx.select({ n: sql<number>`count(*)` }).from(activity_registrations).where(eq(activity_registrations.activity_id, activityId));
      if (Number(n) >= a.seats) throw new AppError("กิจกรรมนี้ที่นั่งเต็มแล้ว");
    }
    await tx.insert(activity_registrations).ignore().values({ activity_id: activityId, user_id: actor.id });
  });
}

export async function listPlans(): Promise<Plan[]> {
  return db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.sort_order));
}

export async function listBoostProducts() {
  return db.select().from(boost_products).where(eq(boost_products.active, true)).orderBy(asc(boost_products.sort_order));
}

/** Upcoming published activities with seats left and whether `userId` is registered (design: qx). */
export async function activitySchedule(userId: string | undefined, limit = 50) {
  const rows = await db.select({
    a: activities,
    taken: sql<number>`(select count(*) from ${activity_registrations} r where r.activity_id = activities.id)`,
    host_name: sql<string | null>`(select pr.display_name from ${profiles} pr where pr.id = activities.host_id)`,
  }).from(activities)
    .where(and(eq(activities.status, "published"), gt(activities.starts_at, new Date().toISOString())))
    .orderBy(asc(activities.starts_at)).limit(limit);
  const mine = await myRegistrations(userId);
  return rows.map(({ a, taken, host_name }) => ({ ...a, host_name, seats_left: a.seats == null ? null : Math.max(0, a.seats - Number(taken)), registered: mine.has(a.id) }));
}

/** All public hubs with listing and seller counts (design: hx Live / Upcoming / Archive). */
export async function hubsOverview() {
  const rows = await db.select({
    h: hubs,
    // Outer columns are written out as hubs.id: drizzle renders ${hubs.id} unqualified, which a subquery would rebind.
    count: sql<number>`(select count(*) from ${hub_properties} hp where hp.hub_id = hubs.id)`,
    sellers: sql<number>`(select count(distinct coalesce(p.agent_id, p.owner_id)) from ${hub_properties} hp
      join ${properties} p on p.id = hp.property_id where hp.hub_id = hubs.id)`,
  }).from(hubs).where(inArray(hubs.status, ["live", "scheduled", "ended"])).orderBy(desc(hubs.starts_at));
  return rows.map((r) => ({ ...r.h, property_count: Number(r.count), seller_count: Number(r.sellers) }));
}
