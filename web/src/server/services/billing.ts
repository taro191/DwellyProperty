import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { boost_products, boosts, orders, plans, properties, subscriptions } from "@/server/db/schema";
import { AppError, DAY, audit, forbidden, notFound, notify, requireActive, type Actor } from "./core";

/** Create a pending order; the price always comes from the catalogue. */
export async function createOrder(actor: Actor, v: { kind: "subscription"; plan_id: string } | { kind: "boost"; boost_product_id: string; property_id: string }) {
  requireActive(actor);
  let price: number | undefined;
  if (v.kind === "subscription") {
    const [p] = await db.select().from(plans).where(and(eq(plans.id, v.plan_id), eq(plans.active, true))).limit(1);
    price = p?.price_thb;
  } else {
    const [prop] = await db.select().from(properties).where(eq(properties.id, v.property_id)).limit(1);
    if (!prop || prop.owner_id !== actor.id || prop.status !== "active") throw forbidden("ดันประกาศได้เฉพาะประกาศของคุณที่เผยแพร่อยู่");
    const [b] = await db.select().from(boost_products).where(and(eq(boost_products.id, v.boost_product_id), eq(boost_products.active, true))).limit(1);
    price = b?.price_thb;
  }
  if (price == null) throw notFound("ไม่พบสินค้า");
  const id = crypto.randomUUID();
  await db.insert(orders).values({
    id, user_id: actor.id, kind: v.kind, amount_thb: price, vat_thb: Math.round((price * 7 / 107) * 100) / 100, // VAT-inclusive prices
    plan_id: v.kind === "subscription" ? v.plan_id : null,
    boost_product_id: v.kind === "boost" ? v.boost_product_id : null,
    property_id: v.kind === "boost" ? v.property_id : null,
  });
  return id;
}

/** Called by the payment provider webhook after verifying its signature. Idempotent. */
export async function fulfillOrder(orderId: string, provider: string, providerRef: string) {
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).for("update");
    if (!o) throw notFound("Order not found");
    if (o.status === "paid") return;
    if (o.status !== "pending") throw new AppError(`Order is ${o.status}`);
    const now = new Date();
    await tx.update(orders).set({ status: "paid", provider, provider_ref: providerRef, paid_at: now.toISOString() }).where(eq(orders.id, orderId));

    if (o.kind === "subscription" && o.plan_id) {
      const [plan] = await tx.select().from(plans).where(eq(plans.id, o.plan_id)).limit(1);
      const sameAudience = await tx.select({ id: plans.id }).from(plans).where(eq(plans.audience, plan.audience));
      await tx.update(subscriptions).set({ status: "cancelled" }).where(and(
        eq(subscriptions.user_id, o.user_id), eq(subscriptions.status, "active"), inArray(subscriptions.plan_id, sameAudience.map((p) => p.id))));
      const end = plan.period === "month" ? new Date(now.getTime() + 30 * DAY) : plan.period === "year" ? new Date(now.getTime() + 365 * DAY) : null;
      await tx.insert(subscriptions).values({ user_id: o.user_id, plan_id: o.plan_id, current_period_end: end?.toISOString() ?? null });
    } else if (o.boost_product_id && o.property_id) {
      const [b] = await tx.select().from(boost_products).where(eq(boost_products.id, o.boost_product_id)).limit(1);
      const [{ last }] = await tx.select({ last: sql<string | null>`max(${boosts.ends_at})` }).from(boosts)
        .where(and(eq(boosts.property_id, o.property_id), eq(boosts.placement, b.placement)));
      const start = new Date(Math.max(now.getTime(), last ? new Date(last.replace(" ", "T") + "Z").getTime() : 0));
      const end = new Date(start.getTime() + b.duration_days * DAY);
      await tx.insert(boosts).values({ property_id: o.property_id, product_id: b.id, order_id: o.id, placement: b.placement, starts_at: start.toISOString(), ends_at: end.toISOString() });
      await tx.update(properties).set({ featured_until: sql`greatest(coalesce(${properties.featured_until}, utc_timestamp(3)), ${end.toISOString().slice(0, 23).replace("T", " ")})` })
        .where(eq(properties.id, o.property_id));
    }
    await notify(tx, o.user_id, { type: "billing", title: "ชำระเงินสำเร็จ", body: `ยอดชำระ ฿${o.amount_thb.toLocaleString("en-US")}`, link: "/me", entityType: "order", entityId: o.id });
    await audit(tx, o.user_id, "ORDER_PAID", "orders", o.id, "Payment confirmed", { provider, ref: providerRef, amount: o.amount_thb });
  });
}

/** The member's current paid plan, if any. */
export async function activePlan(actor: Actor) {
  const [row] = await db.select({ name: plans.name, id: plans.id, ends: subscriptions.current_period_end }).from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.plan_id))
    .where(and(eq(subscriptions.user_id, actor.id), eq(subscriptions.status, "active"))).orderBy(sql`${subscriptions.created_at} desc`).limit(1);
  return row ?? null;
}
