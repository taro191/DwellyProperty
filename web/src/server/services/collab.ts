import "server-only";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { agent_profiles, collab_logs, listing_agents, profiles, properties } from "@/server/db/schema";
import { AppError, DAY, audit, forbidden, notFound, notify, requireActive, type Actor } from "./core";

type Deal = "sale" | "rent";
export type AgentLogKind = "viewing" | "lead_lock" | "customer_feedback" | "offer_submitted" | "marketing";

const LOCK_DAYS = 14;

async function ownedProperty(actor: Actor, propertyId: string) {
  const [p] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!p) throw notFound();
  if (p.owner_id !== actor.id) throw forbidden("เฉพาะเจ้าของทรัพย์เท่านั้น");
  return p;
}

/** Verified-network agents an owner can appoint. */
export async function agentDirectory(limit = 100) {
  return db.select({
    id: profiles.id, name: profiles.display_name, avatar: profiles.avatar_url, agent_code: agent_profiles.agent_code,
    company: agent_profiles.company_name, closed_deals: agent_profiles.closed_deals, license_verified: agent_profiles.license_verified,
  }).from(agent_profiles).innerJoin(profiles, eq(profiles.id, agent_profiles.user_id))
    .where(eq(profiles.status, "active")).orderBy(desc(agent_profiles.closed_deals)).limit(limit);
}

/** Everything the Owner-Agent Hub shows for one listing (owner only). */
export async function ownerCollab(actor: Actor, propertyId: string) {
  await ownedProperty(actor, propertyId);
  const [agents, logs] = await Promise.all([
    db.select({
      a: listing_agents, name: profiles.display_name, avatar: profiles.avatar_url, phone: profiles.phone,
      agent_code: agent_profiles.agent_code, company: agent_profiles.company_name,
    }).from(listing_agents).innerJoin(profiles, eq(profiles.id, listing_agents.agent_id))
      .leftJoin(agent_profiles, eq(agent_profiles.user_id, listing_agents.agent_id))
      .where(and(eq(listing_agents.property_id, propertyId), eq(listing_agents.status, "active"))).orderBy(listing_agents.created_at),
    collabFeed(propertyId),
  ]);
  return {
    agents: agents.map(({ a, ...x }) => {
      const mine = logs.filter((l) => l.author_id === a.agent_id && l.deal === a.deal);
      return {
        ...a, ...x,
        viewings: mine.filter((l) => l.kind === "viewing").length,
        locks: mine.filter((l) => l.kind === "lead_lock").length,
        last: mine[0] ?? null,
      };
    }),
    logs,
  };
}

async function collabFeed(propertyId: string) {
  return db.select({ l: collab_logs, author: profiles.display_name, avatar: profiles.avatar_url }).from(collab_logs)
    .innerJoin(profiles, eq(profiles.id, collab_logs.author_id))
    .where(eq(collab_logs.property_id, propertyId)).orderBy(desc(collab_logs.created_at)).limit(200)
    .then((rows) => rows.map((r) => ({ ...r.l, author_name: r.author, author_avatar: r.avatar })));
}

export async function assignAgent(actor: Actor, v: { property_id: string; agent_id: string; deal: Deal; contract: "open_multi" | "exclusive"; commission: string }) {
  requireActive(actor);
  const p = await ownedProperty(actor, v.property_id);
  if (v.deal === "rent" ? p.listing_type === "sale" : p.listing_type === "rent") throw new AppError("ประกาศนี้ไม่ได้เปิดสำหรับงานประเภทนี้");
  const [agent] = await db.select({ id: agent_profiles.user_id }).from(agent_profiles).where(eq(agent_profiles.user_id, v.agent_id)).limit(1);
  if (!agent || v.agent_id === actor.id) throw new AppError("เลือกนายหน้าในเครือข่าย Dwelly");
  const current = await db.select().from(listing_agents)
    .where(and(eq(listing_agents.property_id, v.property_id), eq(listing_agents.deal, v.deal), eq(listing_agents.status, "active")));
  const others = current.filter((a) => a.agent_id !== v.agent_id);
  if (others.some((a) => a.contract === "exclusive")) throw new AppError("งานนี้มีนายหน้า Exclusive อยู่แล้ว ยกเลิกก่อนแต่งตั้งคนใหม่");
  if (v.contract === "exclusive" && others.length) throw new AppError("แต่งตั้งแบบ Exclusive ได้เมื่อไม่มีนายหน้าคนอื่นดูแลงานนี้");
  await db.transaction(async (tx) => {
    await tx.insert(listing_agents).values({ id: crypto.randomUUID(), ...v, status: "active" })
      .onDuplicateKeyUpdate({ set: { contract: v.contract, commission: v.commission, status: "active" } });
    await tx.insert(collab_logs).values({
      id: crypto.randomUUID(), property_id: v.property_id, author_id: actor.id, deal: v.deal, kind: "marketing",
      summary: `เจ้าของแต่งตั้งนายหน้าดูแล${v.deal === "rent" ? "งานปล่อยเช่า" : "งานขาย"} (${v.contract === "exclusive" ? "Exclusive" : "Open Multi-Agent"}) เงื่อนไขคอมฯ ${v.commission}`,
    });
    await notify(tx, v.agent_id, {
      type: "commission", title: "คุณได้รับแต่งตั้งให้ดูแลทรัพย์", body: `${p.title} · ${v.deal === "rent" ? "งานเช่า" : "งานขาย"} · คอมฯ ${v.commission}`,
      link: "/dashboard/agent/collab", entityType: "property", entityId: p.id,
    });
    await audit(tx, actor.id, "AGENT_ASSIGNED", "property", p.id, null, { agent_id: v.agent_id, deal: v.deal, contract: v.contract });
  });
}

export async function endAgent(actor: Actor, assignmentId: string) {
  requireActive(actor);
  const [a] = await db.select().from(listing_agents).where(eq(listing_agents.id, assignmentId)).limit(1);
  if (!a) throw notFound();
  await ownedProperty(actor, a.property_id);
  await db.transaction(async (tx) => {
    await tx.update(listing_agents).set({ status: "ended" }).where(eq(listing_agents.id, assignmentId));
    await notify(tx, a.agent_id, { type: "commission", title: "เจ้าของทรัพย์ยกเลิกการแต่งตั้ง", link: "/dashboard/agent/collab", entityType: "property", entityId: a.property_id });
    await audit(tx, actor.id, "AGENT_ENDED", "property", a.property_id, null, { agent_id: a.agent_id, deal: a.deal });
  });
}

/** Owner broadcast to every active agent on the deal ("แจ้งราคากลาง/เงื่อนไข"). */
export async function postOwnerNotice(actor: Actor, v: { property_id: string; deal: Deal; summary: string }) {
  requireActive(actor);
  const p = await ownedProperty(actor, v.property_id);
  const text = v.summary.trim();
  if (text.length < 3) throw new AppError("พิมพ์ข้อความแจ้งนายหน้า");
  const agents = await db.select({ id: listing_agents.agent_id }).from(listing_agents)
    .where(and(eq(listing_agents.property_id, p.id), eq(listing_agents.deal, v.deal), eq(listing_agents.status, "active")));
  await db.transaction(async (tx) => {
    await tx.insert(collab_logs).values({ id: crypto.randomUUID(), property_id: p.id, author_id: actor.id, deal: v.deal, kind: "owner_notice", summary: text.slice(0, 2000) });
    for (const a of agents) {
      await notify(tx, a.id, { type: "commission", title: "อัปเดตราคากลาง/เงื่อนไขจากเจ้าของ", body: `${p.title}: ${text.slice(0, 140)}`, link: "/dashboard/agent/collab", entityType: "property", entityId: p.id });
    }
  });
  return agents.length;
}

/** An appointed agent reports work to the owner. A lead lock reserves the client for 14 days. */
export async function logAgentActivity(actor: Actor, v: {
  property_id: string; deal: Deal; kind: AgentLogKind; client_name?: string; client_phone_last4?: string; amount?: number;
  interest?: "ready_to_book" | "interested_high" | "considering"; summary: string;
}) {
  requireActive(actor);
  const [a] = await db.select().from(listing_agents).where(and(
    eq(listing_agents.property_id, v.property_id), eq(listing_agents.agent_id, actor.id), eq(listing_agents.deal, v.deal), eq(listing_agents.status, "active"),
  )).limit(1);
  if (!a) throw forbidden("คุณไม่ได้รับแต่งตั้งให้ดูแลงานนี้");
  const summary = v.summary.trim();
  if (summary.length < 3) throw new AppError("ระบุรายละเอียดการดำเนินงาน");
  let lockUntil: string | null = null;
  if (v.kind === "lead_lock") {
    if (!v.client_name?.trim() || !/^\d{4}$/.test(v.client_phone_last4 ?? "")) throw new AppError("ล็อกสิทธิ์ต้องระบุชื่อลูกค้าและเบอร์โทร 4 ตัวท้าย");
    const [held] = await db.select({ id: collab_logs.id, author: collab_logs.author_id }).from(collab_logs).where(and(
      eq(collab_logs.property_id, v.property_id), eq(collab_logs.kind, "lead_lock"), eq(collab_logs.client_phone_last4, v.client_phone_last4!),
      gt(collab_logs.lock_until, new Date().toISOString()),
    )).limit(1);
    if (held && held.author !== actor.id) throw new AppError("ลูกค้ารายนี้ถูกล็อกสิทธิ์โดยนายหน้าคนอื่นแล้ว");
    lockUntil = new Date(Date.now() + LOCK_DAYS * DAY).toISOString();
  }
  const [p] = await db.select({ owner: properties.owner_id, title: properties.title }).from(properties).where(eq(properties.id, v.property_id)).limit(1);
  await db.transaction(async (tx) => {
    await tx.insert(collab_logs).values({
      id: crypto.randomUUID(), property_id: v.property_id, author_id: actor.id, deal: v.deal, kind: v.kind,
      client_name: v.client_name?.trim().slice(0, 80) || null, client_phone_last4: v.client_phone_last4 || null,
      amount: v.amount ?? null, interest: v.interest ?? null, summary: summary.slice(0, 2000), lock_until: lockUntil,
    });
    await notify(tx, p.owner, { type: "commission", title: "นายหน้ารายงานความคืบหน้า", body: `${p.title}: ${summary.slice(0, 140)}`, link: `/dashboard/collab?p=${v.property_id}`, entityType: "property", entityId: v.property_id });
  });
}

/** The agent's side: listings they are appointed to, with the shared feed. */
export async function agentAssignments(actor: Actor) {
  requireActive(actor);
  const rows = await db.select({ a: listing_agents, p: properties, owner: profiles.display_name, owner_avatar: profiles.avatar_url, owner_phone: profiles.phone, owner_line: profiles.line_id }).from(listing_agents)
    .innerJoin(properties, eq(properties.id, listing_agents.property_id)).innerJoin(profiles, eq(profiles.id, properties.owner_id))
    .where(and(eq(listing_agents.agent_id, actor.id), eq(listing_agents.status, "active"))).orderBy(desc(listing_agents.created_at));
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => r.p.id))];
  const logs = await db.select({ l: collab_logs, author: profiles.display_name }).from(collab_logs)
    .innerJoin(profiles, eq(profiles.id, collab_logs.author_id))
    .where(inArray(collab_logs.property_id, ids)).orderBy(desc(collab_logs.created_at)).limit(500);
  return rows.map(({ a, p, owner, owner_avatar, owner_phone, owner_line }) => {
    const feed = logs.filter((x) => x.l.property_id === p.id && x.l.deal === a.deal).map((x) => ({ ...x.l, author_name: x.author }));
    // Agents see the owner's notices and their own reports, not other agents' clients.
    const visible = feed.filter((l) => l.kind === "owner_notice" || l.author_id === actor.id);
    return {
      assignment: a, property: p, owner_name: owner, owner_avatar, owner_phone, owner_line, logs: visible,
      viewings: visible.filter((l) => l.kind === "viewing").length,
      locks: visible.filter((l) => l.kind === "lead_lock" && l.lock_until && l.lock_until > new Date().toISOString()).length,
    };
  });
}

