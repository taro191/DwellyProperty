import "server-only";
import { and, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { db } from "@/server/db";
import {
  account, account_deletion_requests as adr, activity_registrations, appointments, consents, favorites, inquiries, messages, offers, orders, profiles, properties,
  property_events, user, user_roles,
} from "@/server/db/schema";
import { hashPassword } from "better-auth/crypto";
import { AppError, requireActive, type Actor } from "./core";
import { CONSENT_VERSION } from "@/lib/constants";
import type { AppRole } from "@/lib/types";

export async function completeOnboarding(actor: Actor, v: {
  display_name: string; primary_role: AppRole; roles: AppRole[]; phone?: string; line_id?: string; marketing: boolean; userAgent?: string;
}) {
  requireActive(actor);
  const roles = Array.from(new Set<AppRole>([v.primary_role, ...v.roles]));
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({
      display_name: v.display_name, primary_role: v.primary_role, onboarded_at: new Date().toISOString(),
      phone: v.phone ?? null, line_id: v.line_id ?? null,
    }).where(eq(profiles.id, actor.id));
    await tx.insert(user_roles).ignore().values(roles.map((role) => ({ user_id: actor.id, role })));
    await tx.insert(consents).values([
      { user_id: actor.id, kind: "terms", version: CONSENT_VERSION, granted: true, user_agent: v.userAgent?.slice(0, 300) },
      { user_id: actor.id, kind: "privacy", version: CONSENT_VERSION, granted: true, user_agent: v.userAgent?.slice(0, 300) },
      { user_id: actor.id, kind: "marketing", version: CONSENT_VERSION, granted: v.marketing, user_agent: v.userAgent?.slice(0, 300) },
    ]);
  });
}

/** Profile header counters (design: hm stats row). */
export async function profileStats(actor: Actor) {
  const n = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
  const [saved, appts, offerCount, views] = await Promise.all([
    n(db.select({ n: count() }).from(favorites).where(eq(favorites.user_id, actor.id))),
    n(db.select({ n: count() }).from(appointments).where(eq(appointments.buyer_id, actor.id))),
    n(db.select({ n: count() }).from(offers).where(eq(offers.buyer_id, actor.id))),
    n(db.select({ n: count() }).from(property_events).where(and(eq(property_events.user_id, actor.id), eq(property_events.kind, "view")))),
  ]);
  return { saved, appointments: appts, offers: offerCount, views };
}

/** What the Dwelly Pass journey and stamps are made of (design: Hx). */
export async function passProgress(actor: Actor) {
  const n = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
  const [stats, chats, videoTours, events, [p]] = await Promise.all([
    profileStats(actor),
    n(db.select({ n: count() }).from(messages).where(eq(messages.sender_id, actor.id))),
    n(db.select({ n: count() }).from(appointments).where(and(eq(appointments.buyer_id, actor.id), eq(appointments.format, "video")))),
    n(db.select({ n: count() }).from(activity_registrations).where(eq(activity_registrations.user_id, actor.id))),
    db.select({ onboarded_at: profiles.onboarded_at }).from(profiles).where(eq(profiles.id, actor.id)).limit(1),
  ]);
  return { ...stats, chats, videoTours, events, onboarded: Boolean(p?.onboarded_at) };
}

/** Switch the role the app is tailored to (design: "สลับบทบาทการใช้งาน"); also grants that role. */
export async function setPrimaryRole(actor: Actor, role: AppRole) {
  requireActive(actor);
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ primary_role: role }).where(eq(profiles.id, actor.id));
    await tx.insert(user_roles).ignore().values({ user_id: actor.id, role });
  });
}

/**
 * Give a just-verified user (email OTP) a password for email sign-in. Never replaces an existing
 * password: returns false when the account already has one.
 */
export async function setInitialPassword(actor: Actor, password: string) {
  requireActive(actor);
  if (password.length < 8) throw new AppError("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
  const [existing] = await db.select({ id: account.id }).from(account)
    .where(and(eq(account.userId, actor.id), eq(account.providerId, "credential"))).limit(1);
  if (existing) return false;
  const now = new Date();
  await db.insert(account).values({
    id: crypto.randomUUID(), userId: actor.id, accountId: actor.id, providerId: "credential", password: await hashPassword(password), createdAt: now, updatedAt: now,
  });
  return true;
}

/** After an email-verified sign-up: password for email sign-in, and the name for a profile not yet onboarded. */
export async function finishSignUp(actor: Actor, v: { name: string; password: string }) {
  await setInitialPassword(actor, v.password);
  await db.update(profiles).set({ display_name: v.name }).where(and(eq(profiles.id, actor.id), isNull(profiles.onboarded_at)));
}

/** How the user signs in: "google" | "line" | "credential" (email). */
export async function signInProvider(userId: string) {
  const rows = await db.select({ p: account.providerId }).from(account).where(eq(account.userId, userId));
  const ids = rows.map((r) => r.p);
  return ids.includes("google") ? "google" : ids.includes("line") ? "line" : "credential";
}

export async function getContact(userId: string) {
  const [p] = await db.select({ phone: profiles.phone, line_id: profiles.line_id, phone_verified: profiles.phone_verified })
    .from(profiles).where(eq(profiles.id, userId)).limit(1);
  return p ?? { phone: null, line_id: null, phone_verified: false };
}

export async function saveProfile(actor: Actor, v: { display_name: string; bio?: string; phone?: string; line_id?: string }) {
  requireActive(actor);
  await db.update(profiles).set({ display_name: v.display_name, bio: v.bio ?? null, phone: v.phone ?? null, line_id: v.line_id ?? null })
    .where(eq(profiles.id, actor.id));
}

export async function setAvatar(actor: Actor, url: string) {
  requireActive(actor);
  await db.update(profiles).set({ avatar_url: url }).where(eq(profiles.id, actor.id));
}

// ---------------------------------------------------------------------------
// PDPA
// ---------------------------------------------------------------------------
export async function latestConsents(actor: Actor) {
  const rows = await db.select().from(consents).where(eq(consents.user_id, actor.id)).orderBy(desc(consents.created_at), desc(consents.id));
  const latest: Partial<Record<"terms" | "privacy" | "marketing", (typeof rows)[number]>> = {};
  for (const r of rows) latest[r.kind] ??= r;
  return latest;
}

export async function setMarketingConsent(actor: Actor, granted: boolean) {
  await db.insert(consents).values({ user_id: actor.id, kind: "marketing", version: CONSENT_VERSION, granted });
}

/** Right of access: everything we hold about the caller. */
export async function exportMyData(actor: Actor) {
  const mine = (col: AnyMySqlColumn, col2: AnyMySqlColumn) => or(eq(col, actor.id), eq(col2, actor.id));
  const [[profile], [account], roles, props, favs, inqs, appts, offs, msgs, cons, ords] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, actor.id)),
    db.select({ email: user.email, created_at: user.createdAt }).from(user).where(eq(user.id, actor.id)),
    db.select().from(user_roles).where(eq(user_roles.user_id, actor.id)),
    db.select().from(properties).where(eq(properties.owner_id, actor.id)),
    db.select().from(favorites).where(eq(favorites.user_id, actor.id)),
    db.select().from(inquiries).where(mine(inquiries.buyer_id, inquiries.seller_id)),
    db.select().from(appointments).where(mine(appointments.buyer_id, appointments.seller_id)),
    db.select().from(offers).where(mine(offers.buyer_id, offers.seller_id)),
    db.select().from(messages).where(eq(messages.sender_id, actor.id)),
    db.select().from(consents).where(eq(consents.user_id, actor.id)),
    db.select().from(orders).where(eq(orders.user_id, actor.id)),
  ]);
  return {
    exported_at: new Date().toISOString(), account, profile, roles, properties: props, favorites: favs, inquiries: inqs,
    appointments: appts, offers: offs, messages_sent: msgs, consents: cons, orders: ords,
  };
}

export async function openDeletionRequest(actor: Actor) {
  const [r] = await db.select().from(adr).where(and(eq(adr.user_id, actor.id), inArray(adr.status, ["pending", "processing"]))).limit(1);
  return r ?? null;
}

export async function requestDeletion(actor: Actor, reason?: string) {
  if (await openDeletionRequest(actor)) throw new AppError("คุณส่งคำขอลบบัญชีไว้แล้ว");
  await db.insert(adr).values({ user_id: actor.id, reason: reason ?? null });
}

export async function cancelDeletion(actor: Actor) {
  await db.update(adr).set({ status: "cancelled" }).where(and(eq(adr.user_id, actor.id), eq(adr.status, "pending")));
}
