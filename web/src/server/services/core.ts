import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, type DB } from "@/server/db";
import { audit_logs, counters, notifications, staff_members } from "@/server/db/schema";
import type { AccountStatus, AppRole, StaffRole } from "@/lib/types";

/** Anything that can run queries: the pool or a transaction. */
export type Tx = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

/** The signed-in user as seen by services. */
export interface Actor {
  id: string;
  status: AccountStatus;
  roles: AppRole[];
  staffRole: StaffRole | null;
}

/** Business-rule violation with a user-facing (Thai) message. */
export class AppError extends Error {
  constructor(message: string, public code: "forbidden" | "not_found" | "invalid" | "conflict" = "invalid") {
    super(message);
  }
}

export const forbidden = (msg = "คุณไม่มีสิทธิ์ทำรายการนี้") => new AppError(msg, "forbidden");
export const notFound = (msg = "ไม่พบข้อมูล") => new AppError(msg, "not_found");

/** Staff check; super_admin passes every role check. */
export function isStaff(actor: Actor | null | undefined, roles?: StaffRole[]): boolean {
  if (!actor?.staffRole) return false;
  if (!roles || actor.staffRole === "super_admin") return true;
  return roles.includes(actor.staffRole);
}

export function requireStaffRole(actor: Actor, roles?: StaffRole[]) {
  if (!isStaff(actor, roles)) throw forbidden("ต้องเป็นทีมงานที่มีสิทธิ์เท่านั้น");
}

/** Signed-in and not suspended/banned/deleted — required for every user write. */
export function requireActive(actor: Actor | null | undefined): asserts actor is Actor {
  if (!actor) throw new AppError("กรุณาเข้าสู่ระบบก่อน", "forbidden");
  if (actor.status !== "active") throw forbidden("บัญชีของคุณถูกระงับ ไม่สามารถทำรายการได้");
}

export async function audit(
  tx: Tx, actorId: string | null, action: string, entityType: string, entityId: string | null,
  summary?: string | null, data: Record<string, unknown> = {},
) {
  await tx.insert(audit_logs).values({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, summary: summary ?? null, data });
}

export async function notify(
  tx: Tx, userId: string | null | undefined, n: { type: string; title: string; body?: string | null; link?: string | null; entityType?: string; entityId?: string },
) {
  if (!userId) return;
  await tx.insert(notifications).values({
    user_id: userId, type: n.type, title: n.title.slice(0, 200), body: n.body?.slice(0, 500) ?? null, link: n.link ?? null,
    entity_type: n.entityType ?? null, entity_id: n.entityId ?? null,
  });
}

/** Atomically allocates the next number of a named counter (must run inside a transaction). */
export async function nextCounter(tx: Tx, name: string, start: number): Promise<number> {
  await tx.insert(counters).values({ name, value: start - 1 }).onDuplicateKeyUpdate({ set: { name } });
  await tx.update(counters).set({ value: sql`${counters.value} + 1` }).where(eq(counters.name, name));
  const [row] = await tx.select({ value: counters.value }).from(counters).where(eq(counters.name, name)).for("update");
  return row.value;
}

export async function loadStaffRole(userId: string): Promise<StaffRole | null> {
  const [s] = await db.select().from(staff_members).where(eq(staff_members.user_id, userId)).limit(1);
  return s?.active ? s.role : null;
}

export const isoIn = (ms: number) => new Date(Date.now() + ms).toISOString();
export const DAY = 86_400_000;
