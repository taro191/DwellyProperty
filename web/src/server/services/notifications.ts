import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";
import type { Actor } from "./core";
import type { Notification } from "@/lib/types";

export async function listNotifications(actor: Actor): Promise<Notification[]> {
  return db.select().from(notifications).where(eq(notifications.user_id, actor.id))
    .orderBy(desc(notifications.created_at)).limit(100);
}

export async function unreadNotificationCount(actor: Actor) {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(notifications)
    .where(and(eq(notifications.user_id, actor.id), isNull(notifications.read_at)));
  return Number(r.n);
}

export async function markNotificationsRead(actor: Actor, id?: string) {
  await db.update(notifications).set({ read_at: new Date().toISOString() })
    .where(and(eq(notifications.user_id, actor.id), isNull(notifications.read_at), id ? eq(notifications.id, id) : undefined));
}
