import "server-only";
import { EventEmitter } from "node:events";
import { alias } from "drizzle-orm/mysql-core";
import { and, asc, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { conversation_participants as cp, conversations, messages, notifications, profiles, properties } from "@/server/db/schema";
import { AppError, forbidden, isStaff, notFound, notify, requireActive, type Actor } from "./core";
import type { ConversationSummary, Message } from "@/lib/types";

/**
 * In-process pub/sub for live chat (Server-Sent Events). Works for a single Node process;
 * if the app is scaled to several instances, swap this for Redis pub/sub.
 */
const g = globalThis as unknown as { __dwellyBus?: EventEmitter };
export const chatBus = (g.__dwellyBus ??= new EventEmitter().setMaxListeners(10_000));

export async function isMember(conversationId: string, userId: string) {
  const [row] = await db.select({ u: cp.user_id }).from(cp)
    .where(and(eq(cp.conversation_id, conversationId), eq(cp.user_id, userId))).limit(1);
  return Boolean(row);
}

/** Find or create the 1:1 thread between the caller and the listing contact (or another user). */
export async function startConversation(actor: Actor, propertyId: string | null, otherUserId?: string) {
  requireActive(actor);
  let other = otherUserId ?? null;
  if (!other && propertyId) {
    const [p] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
    if (!p || !["active", "reserved", "sold", "rented"].includes(p.status)) throw notFound("ประกาศนี้ปิดไปแล้ว");
    other = p.agent_id ?? p.owner_id;
  }
  if (!other || other === actor.id) throw new AppError("ไม่สามารถเริ่มแชทได้");

  const b = alias(cp, "b");
  const [existing] = await db.select({ id: conversations.id }).from(conversations)
    .innerJoin(cp, and(eq(cp.conversation_id, conversations.id), eq(cp.user_id, actor.id)))
    .innerJoin(b, and(eq(b.conversation_id, conversations.id), eq(b.user_id, other)))
    .where(propertyId ? eq(conversations.property_id, propertyId) : isNull(conversations.property_id))
    .limit(1);
  if (existing) {
    await db.update(cp).set({ archived: false }).where(and(eq(cp.conversation_id, existing.id), eq(cp.user_id, actor.id)));
    return existing.id;
  }
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(conversations).values({ id, property_id: propertyId, created_by: actor.id });
    await tx.insert(cp).values([{ conversation_id: id, user_id: actor.id }, { conversation_id: id, user_id: other! }]);
  });
  return id;
}

export async function listConversations(actor: Actor): Promise<ConversationSummary[]> {
  const me = alias(cp, "me");
  const them = alias(cp, "them");
  const rows = await db.select({
    id: conversations.id, property_id: conversations.property_id, property_title: properties.title, property_code: properties.code,
    other_user_id: them.user_id, other_name: profiles.display_name, other_avatar: profiles.avatar_url,
    last_message_at: conversations.last_message_at, last_message_preview: conversations.last_message_preview,
    unread_count: sql<number>`(select count(*) from ${messages} m where m.conversation_id = ${conversations.id}
      and m.sender_id <> ${actor.id} and m.created_at > coalesce(${me.last_read_at}, '1970-01-01'))`,
  })
    .from(me)
    .innerJoin(conversations, eq(conversations.id, me.conversation_id))
    .leftJoin(them, and(eq(them.conversation_id, conversations.id), ne(them.user_id, actor.id)))
    .leftJoin(profiles, eq(profiles.id, them.user_id))
    .leftJoin(properties, eq(properties.id, conversations.property_id))
    .where(and(eq(me.user_id, actor.id), eq(me.archived, false)))
    .orderBy(sql`${conversations.last_message_at} is null`, desc(conversations.last_message_at));
  return rows.map((r) => ({ ...r, unread_count: Number(r.unread_count) }));
}

export async function unreadMessageCount(actor: Actor) {
  return (await listConversations(actor)).reduce((n, c) => n + c.unread_count, 0);
}

export async function getConversation(actor: Actor, id: string) {
  const member = await isMember(id, actor.id);
  if (!member && !isStaff(actor, ["support"])) return null;
  const [conv] = await db.select({ id: conversations.id, property_title: properties.title, property_code: properties.code })
    .from(conversations).leftJoin(properties, eq(properties.id, conversations.property_id))
    .where(eq(conversations.id, id)).limit(1);
  if (!conv) return null;
  const [others, msgs] = await Promise.all([
    db.select({ user_id: cp.user_id, display_name: profiles.display_name, avatar_url: profiles.avatar_url })
      .from(cp).innerJoin(profiles, eq(profiles.id, cp.user_id))
      .where(and(eq(cp.conversation_id, id), ne(cp.user_id, actor.id))),
    db.select().from(messages).where(eq(messages.conversation_id, id)).orderBy(asc(messages.created_at)).limit(500),
  ]);
  if (member) await markConversationRead(actor, id);
  return { ...conv, other: others[0] ?? null, messages: msgs as Message[] };
}

export async function markConversationRead(actor: Actor, id: string) {
  const now = new Date().toISOString();
  await db.update(cp).set({ last_read_at: now }).where(and(eq(cp.conversation_id, id), eq(cp.user_id, actor.id)));
  await db.update(notifications).set({ read_at: now })
    .where(and(eq(notifications.user_id, actor.id), eq(notifications.entity_id, id), isNull(notifications.read_at)));
}

export async function sendMessage(actor: Actor, conversationId: string, body: string): Promise<Message> {
  requireActive(actor);
  const text = body.trim();
  if (!text) throw new AppError("พิมพ์ข้อความก่อนส่ง");
  if (text.length > 4000) throw new AppError("ข้อความยาวเกินไป");
  if (!(await isMember(conversationId, actor.id))) throw forbidden();

  const msg = { id: crypto.randomUUID(), conversation_id: conversationId, sender_id: actor.id, body: text, attachment_path: null, created_at: new Date().toISOString() };
  const recipients = await db.transaction(async (tx) => {
    await tx.insert(messages).values(msg);
    await tx.update(conversations).set({ last_message_at: msg.created_at, last_message_preview: text.slice(0, 140) })
      .where(eq(conversations.id, conversationId));
    await tx.update(cp).set({ last_read_at: msg.created_at, archived: false })
      .where(and(eq(cp.conversation_id, conversationId), eq(cp.user_id, actor.id)));
    const others = await tx.select({ user_id: cp.user_id }).from(cp)
      .where(and(eq(cp.conversation_id, conversationId), ne(cp.user_id, actor.id)));
    // One unread "message" notification per conversation per recipient.
    const already = others.length
      ? await tx.select({ user_id: notifications.user_id }).from(notifications).where(and(
          inArray(notifications.user_id, others.map((o) => o.user_id)), eq(notifications.type, "message"),
          eq(notifications.entity_id, conversationId), isNull(notifications.read_at)))
      : [];
    for (const o of others) {
      if (!already.some((a) => a.user_id === o.user_id)) {
        await notify(tx, o.user_id, { type: "message", title: "ข้อความใหม่", body: text.slice(0, 140), link: `/messages/${conversationId}`, entityType: "conversation", entityId: conversationId });
      }
    }
    return others.map((o) => o.user_id);
  });
  chatBus.emit(`conv:${conversationId}`, msg);
  for (const r of recipients) chatBus.emit(`user:${r}`, { type: "message", conversationId });
  return msg;
}

/** Messages after a timestamp — used by the SSE stream to catch up after reconnects. */
export async function messagesSince(conversationId: string, sinceIso: string) {
  return db.select().from(messages)
    .where(and(eq(messages.conversation_id, conversationId), gt(messages.created_at, sinceIso)))
    .orderBy(asc(messages.created_at)).limit(200);
}
