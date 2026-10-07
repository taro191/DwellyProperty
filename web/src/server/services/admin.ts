import "server-only";
import { and, desc, eq, gt, inArray, like, lt, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  account, account_deletion_requests as adr, agent_profiles, appointments, audit_logs, favorites, hubs, hub_properties, inquiries, messages,
  notifications, offers, orders, profiles, properties, reports, saved_searches, session, staff_members, subscriptions, user, user_roles,
  verification_documents, verification_requests, zones,
} from "@/server/db/schema";
import { AppError, DAY, audit, forbidden, isStaff, notFound, notify, type Actor } from "./core";
import type { AccountStatus, ReportStatus, StaffRole } from "@/lib/types";

const count = (n: unknown) => Number(n ?? 0);

export async function dashboardStats(actor: Actor) {
  if (!isStaff(actor)) throw forbidden();
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
  const monthAgo = new Date(Date.now() - 30 * DAY).toISOString();
  const c = () => sql<number>`count(*)`;
  const [[u], [u7], [la], [lp], [vp], [ro], [i7], [a7], [o7], [rev], [del], byCat] = await Promise.all([
    db.select({ n: c() }).from(profiles).where(ne(profiles.status, "deleted")),
    db.select({ n: c() }).from(profiles).where(gt(profiles.created_at, weekAgo)),
    db.select({ n: c() }).from(properties).where(eq(properties.status, "active")),
    db.select({ n: c() }).from(properties).where(eq(properties.status, "pending_review")),
    db.select({ n: c() }).from(verification_requests).where(eq(verification_requests.status, "pending")),
    db.select({ n: c() }).from(reports).where(inArray(reports.status, ["open", "investigating"])),
    db.select({ n: c() }).from(inquiries).where(gt(inquiries.created_at, weekAgo)),
    db.select({ n: c() }).from(appointments).where(gt(appointments.created_at, weekAgo)),
    db.select({ n: c() }).from(offers).where(gt(offers.created_at, weekAgo)),
    db.select({ n: sql<number>`coalesce(sum(${orders.amount_thb}), 0)` }).from(orders).where(and(eq(orders.status, "paid"), gt(orders.paid_at, monthAgo))),
    db.select({ n: c() }).from(adr).where(eq(adr.status, "pending")),
    db.select({ category: properties.category, n: c() }).from(properties).where(eq(properties.status, "active")).groupBy(properties.category),
  ]);
  return {
    users_total: count(u.n), users_new_7d: count(u7.n), listings_active: count(la.n), listings_pending: count(lp.n),
    verifications_pending: count(vp.n), reports_open: count(ro.n), inquiries_7d: count(i7.n), appointments_7d: count(a7.n),
    offers_7d: count(o7.n), revenue_30d: count(rev.n), deletion_requests_open: count(del.n),
    listings_by_category: Object.fromEntries(byCat.map((r) => [r.category, count(r.n)])),
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export async function searchUsers(actor: Actor, q: string, status: string) {
  if (!isStaff(actor, ["support", "verifier"])) throw forbidden();
  const term = `%${q.replace(/[%_\\]/g, "")}%`;
  const rows = await db.select({ p: profiles, email: user.email }).from(profiles).innerJoin(user, eq(user.id, profiles.id))
    .where(and(
      q ? (q.includes("@") ? like(user.email, term) : like(profiles.display_name, term)) : undefined,
      status ? eq(profiles.status, status as AccountStatus) : undefined,
    )).orderBy(desc(profiles.created_at)).limit(100);
  const roles = rows.length ? await db.select().from(user_roles).where(inArray(user_roles.user_id, rows.map((r) => r.p.id))) : [];
  return rows.map((r) => ({ ...r.p, email: r.email, roles: roles.filter((x) => x.user_id === r.p.id).map((x) => x.role) }));
}

export async function userDetail(actor: Actor, id: string) {
  if (!isStaff(actor, ["support", "verifier"])) throw forbidden();
  const [row] = await db.select({ p: profiles, email: user.email }).from(profiles).innerJoin(user, eq(user.id, profiles.id)).where(eq(profiles.id, id)).limit(1);
  if (!row) return null;
  const [roles, listings, userReports, verifications, [staff]] = await Promise.all([
    db.select({ role: user_roles.role }).from(user_roles).where(eq(user_roles.user_id, id)),
    db.select({ id: properties.id, code: properties.code, title: properties.title, status: properties.status }).from(properties)
      .where(eq(properties.owner_id, id)).orderBy(desc(properties.created_at)).limit(50),
    db.select().from(reports).where(and(eq(reports.target_type, "user"), eq(reports.target_id, id))),
    db.select({ id: verification_requests.id, kind: verification_requests.kind, status: verification_requests.status, submitted_at: verification_requests.submitted_at })
      .from(verification_requests).where(eq(verification_requests.user_id, id)).orderBy(desc(verification_requests.submitted_at)),
    db.select().from(staff_members).where(eq(staff_members.user_id, id)).limit(1),
  ]);
  return { ...row.p, email: row.email, roles: roles.map((r) => r.role), listings, reports: userReports, verifications, staff: staff ?? null };
}

export async function setUserStatus(actor: Actor, id: string, status: Exclude<AccountStatus, "deleted">, reason?: string | null) {
  if (!isStaff(actor, ["support"])) throw forbidden();
  if (id === actor.id) throw new AppError("ไม่สามารถเปลี่ยนสถานะบัญชีของตัวเองได้");
  if (status !== "active" && !reason?.trim()) throw new AppError("กรุณาระบุเหตุผล");
  await db.transaction(async (tx) => {
    const [s] = await tx.select().from(staff_members).where(eq(staff_members.user_id, id)).limit(1);
    if (s?.active && !isStaff(actor, ["super_admin"])) throw forbidden("เฉพาะ Super Admin เปลี่ยนสถานะบัญชีทีมงานได้");
    await tx.update(profiles).set({ status, status_reason: reason ?? null }).where(eq(profiles.id, id));
    if (status === "banned") {
      await tx.update(properties).set({ status: "archived" })
        .where(and(eq(properties.owner_id, id), inArray(properties.status, ["active", "reserved", "pending_review"])));
    }
    if (status !== "active") await tx.delete(session).where(eq(session.userId, id)); // sign them out
    await audit(tx, actor.id, `USER_STATUS_${status.toUpperCase()}`, "profiles", id, reason ?? null);
  });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export async function listReports(actor: Actor, status?: ReportStatus) {
  if (!isStaff(actor, ["moderator", "support"])) throw forbidden();
  const rows = await db.select({ r: reports, reporter_name: profiles.display_name }).from(reports)
    .leftJoin(profiles, eq(profiles.id, reports.reporter_id))
    .where(status ? eq(reports.status, status) : inArray(reports.status, ["open", "investigating"]))
    .orderBy(reports.created_at).limit(100);
  return rows.map((x) => ({ ...x.r, reporter: x.reporter_name ? { display_name: x.reporter_name } : null }));
}

export async function reportsForTarget(actor: Actor, targetType: "property" | "user", id: string) {
  if (!isStaff(actor)) throw forbidden();
  return db.select().from(reports).where(and(eq(reports.target_type, targetType), eq(reports.target_id, id))).orderBy(desc(reports.created_at));
}

export async function resolveReport(actor: Actor, id: string, status: Exclude<ReportStatus, "open">, note?: string | null) {
  if (!isStaff(actor, ["moderator", "support"])) throw forbidden();
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(reports).where(eq(reports.id, id)).limit(1).for("update");
    if (!r) throw notFound();
    const done = status === "resolved" || status === "dismissed";
    await tx.update(reports).set({ status, handled_by: actor.id, resolution_note: note ?? null, resolved_at: done ? new Date().toISOString() : null })
      .where(eq(reports.id, id));
    if (done) await notify(tx, r.reporter_id, { type: "report", title: "เราได้ตรวจสอบรายงานของคุณแล้ว", body: note, entityType: "report", entityId: id });
    await audit(tx, actor.id, `REPORT_${status.toUpperCase()}`, "reports", id, note ?? null, { target_type: r.target_type, target_id: r.target_id });
  });
}

// ---------------------------------------------------------------------------
// Staff & audit
// ---------------------------------------------------------------------------
export async function listStaff(actor: Actor) {
  if (!isStaff(actor, ["super_admin"])) throw forbidden();
  return db.select({ s: staff_members, name: profiles.display_name }).from(staff_members)
    .innerJoin(profiles, eq(profiles.id, staff_members.user_id)).orderBy(desc(staff_members.active), staff_members.created_at);
}

export async function setStaff(actor: Actor, v: { user_id?: string; email?: string; role: StaffRole; active: boolean }) {
  if (!isStaff(actor, ["super_admin"])) throw forbidden();
  let userId = v.user_id;
  if (!userId && v.email) {
    const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, v.email.toLowerCase())).limit(1);
    userId = u?.id;
  }
  if (!userId) throw new AppError("ไม่พบผู้ใช้ — ให้ผู้ใช้สมัครสมาชิกก่อน");
  if (userId === actor.id && !v.active) throw new AppError("ไม่สามารถปิดใช้งานบัญชีตัวเองได้");
  await db.transaction(async (tx) => {
    await tx.insert(staff_members).values({ user_id: userId!, role: v.role, active: v.active, created_by: actor.id })
      .onDuplicateKeyUpdate({ set: { role: v.role, active: v.active } });
    await audit(tx, actor.id, "STAFF_SET", "staff_members", userId!, v.role, { active: v.active });
  });
}

export async function listAudit(actor: Actor, actionPrefix: string, page: number, pageSize = 100) {
  if (!isStaff(actor)) throw forbidden();
  const rows = await db.select({ a: audit_logs, actor_name: profiles.display_name }).from(audit_logs)
    .leftJoin(profiles, eq(profiles.id, audit_logs.actor_id))
    .where(actionPrefix ? like(audit_logs.action, `${actionPrefix}%`) : undefined)
    .orderBy(desc(audit_logs.id)).limit(pageSize).offset((page - 1) * pageSize);
  return rows.map((r) => ({ ...r.a, actor_name: r.actor_name }));
}

export async function entityHistory(actor: Actor, entityType: string, id: string) {
  if (!isStaff(actor)) throw forbidden();
  return db.select().from(audit_logs).where(and(eq(audit_logs.entity_type, entityType), eq(audit_logs.entity_id, id)))
    .orderBy(desc(audit_logs.id)).limit(20);
}

// ---------------------------------------------------------------------------
// PDPA deletion
// ---------------------------------------------------------------------------
export async function listDeletionRequests(actor: Actor) {
  if (!isStaff(actor, ["support"])) throw forbidden();
  const rows = await db.select({ r: adr, name: profiles.display_name }).from(adr).innerJoin(profiles, eq(profiles.id, adr.user_id))
    .orderBy(desc(adr.requested_at)).limit(100);
  return rows.map((x) => ({ ...x.r, user: { id: x.r.user_id, display_name: x.name } }));
}

/**
 * Anonymise the account and remove personal data not legally required.
 * Keeps orders/invoices (tax law) and deal rows (counterparty history) without personal details.
 * Returns storage paths the caller should delete.
 */
export async function processDeletion(actor: Actor, requestId: string) {
  if (!isStaff(actor, ["support"])) throw forbidden();
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(adr).where(eq(adr.id, requestId)).limit(1).for("update");
    if (!r) throw notFound();
    if (!["pending", "processing"].includes(r.status)) throw new AppError("คำขอนี้ดำเนินการแล้ว");
    const uid = r.user_id;
    const [s] = await tx.select().from(staff_members).where(and(eq(staff_members.user_id, uid), eq(staff_members.active, true))).limit(1);
    if (s) throw new AppError("ปิดสิทธิ์ทีมงานของบัญชีนี้ก่อน");

    const docs = await tx.select({ path: verification_documents.storage_path }).from(verification_documents)
      .innerJoin(verification_requests, eq(verification_requests.id, verification_documents.request_id))
      .where(eq(verification_requests.user_id, uid));

    await tx.update(profiles).set({
      display_name: "ผู้ใช้ที่ลบบัญชีแล้ว", avatar_url: null, bio: null, phone: null, line_id: null, phone_verified: false,
      status: "deleted", status_reason: "PDPA deletion request",
    }).where(eq(profiles.id, uid));
    await tx.update(user).set({ name: "deleted", email: `deleted+${uid}@deleted.invalid`, image: null }).where(eq(user.id, uid));
    await tx.delete(session).where(eq(session.userId, uid));
    await tx.delete(account).where(eq(account.userId, uid)); // removes password + social links: login impossible
    await tx.update(properties).set({ status: "archived" }).where(and(eq(properties.owner_id, uid), inArray(properties.status, ["draft", "pending_review", "active", "reserved", "expired", "rejected"])));
    await tx.update(properties).set({ agent_id: null }).where(eq(properties.agent_id, uid));
    await tx.delete(favorites).where(eq(favorites.user_id, uid));
    await tx.delete(saved_searches).where(eq(saved_searches.user_id, uid));
    await tx.delete(notifications).where(eq(notifications.user_id, uid));
    await tx.delete(agent_profiles).where(eq(agent_profiles.user_id, uid));
    await tx.update(inquiries).set({ contact_phone: null, message: null }).where(eq(inquiries.buyer_id, uid));
    await tx.update(messages).set({ body: "[ข้อความถูกลบตามคำขอของผู้ใช้]", attachment_path: null }).where(eq(messages.sender_id, uid));
    await tx.delete(verification_documents).where(inArray(verification_documents.request_id,
      tx.select({ id: verification_requests.id }).from(verification_requests).where(eq(verification_requests.user_id, uid))));
    await tx.update(verification_requests).set({ submitted_data: {} }).where(eq(verification_requests.user_id, uid));
    await tx.update(subscriptions).set({ status: "cancelled" }).where(and(eq(subscriptions.user_id, uid), eq(subscriptions.status, "active")));
    await tx.update(adr).set({ status: "completed", processed_by: actor.id, processed_at: new Date().toISOString() }).where(eq(adr.id, requestId));
    await audit(tx, actor.id, "ACCOUNT_DELETED", "profiles", uid, "PDPA deletion processed");
    return { userId: uid, docPaths: docs.map((d) => d.path) };
  });
}

// ---------------------------------------------------------------------------
// Content management
// ---------------------------------------------------------------------------
export async function createHub(actor: Actor, v: {
  slug: string; name: string; description?: string; zone_id?: string; starts_at: string; ends_at: string; status: "draft" | "scheduled" | "live" | "ended";
}) {
  if (!isStaff(actor, ["moderator"])) throw forbidden();
  if (new Date(v.ends_at) <= new Date(v.starts_at)) throw new AppError("วันสิ้นสุดต้องหลังวันเริ่ม");
  await db.transaction(async (tx) => {
    const [dup] = await tx.select({ id: hubs.id }).from(hubs).where(eq(hubs.slug, v.slug)).limit(1);
    if (dup) throw new AppError("slug นี้ถูกใช้แล้ว");
    const id = crypto.randomUUID();
    await tx.insert(hubs).values({ ...v, id, description: v.description ?? null, zone_id: v.zone_id ?? null, created_by: actor.id });
    if (v.zone_id) {
      const props = await tx.select({ id: properties.id }).from(properties).where(and(eq(properties.zone_id, v.zone_id), eq(properties.status, "active")));
      if (props.length) await tx.insert(hub_properties).values(props.map((p) => ({ hub_id: id, property_id: p.id })));
    }
    await audit(tx, actor.id, "HUB_CREATED", "hubs", id, v.name);
  });
}

export async function setHubStatus(actor: Actor, id: string, status: "draft" | "scheduled" | "live" | "ended") {
  if (!isStaff(actor, ["moderator"])) throw forbidden();
  await db.update(hubs).set({ status }).where(eq(hubs.id, id));
}

export async function setZoneActive(actor: Actor, id: string, active: boolean) {
  if (!isStaff(actor, ["moderator"])) throw forbidden();
  await db.update(zones).set({ active }).where(eq(zones.id, id));
}

// ---------------------------------------------------------------------------
// Scheduled maintenance (run hourly: `npm run maintenance` or POST /api/cron/maintenance)
// ---------------------------------------------------------------------------
export async function runMaintenance() {
  const now = new Date().toISOString();
  const soon = new Date(Date.now() + 3 * DAY).toISOString();
  return db.transaction(async (tx) => {
    // Warn owners 3 days before expiry (once per listing).
    const expiring = await tx.select({ id: properties.id, owner_id: properties.owner_id, title: properties.title }).from(properties)
      .where(and(eq(properties.status, "active"), gt(properties.expires_at, now), lt(properties.expires_at, soon)));
    let warned = 0;
    for (const p of expiring) {
      const [already] = await tx.select({ id: notifications.id }).from(notifications)
        .where(and(eq(notifications.entity_id, p.id), eq(notifications.type, "listing_expiring"))).limit(1);
      if (!already) {
        await notify(tx, p.owner_id, { type: "listing_expiring", title: "ประกาศใกล้หมดอายุ", body: p.title, link: `/dashboard/listings/${p.id}`, entityType: "property", entityId: p.id });
        warned++;
      }
    }
    const expired = await tx.select({ id: properties.id, owner_id: properties.owner_id, title: properties.title }).from(properties)
      .where(and(eq(properties.status, "active"), lt(properties.expires_at, now)));
    for (const p of expired) {
      await tx.update(properties).set({ status: "expired" }).where(eq(properties.id, p.id));
      await notify(tx, p.owner_id, { type: "listing", title: "ประกาศหมดอายุแล้ว", body: p.title, link: `/dashboard/listings/${p.id}`, entityType: "property", entityId: p.id });
    }
    const [offerRes] = await tx.update(offers).set({ status: "expired" }).where(and(inArray(offers.status, ["pending", "countered"]), lt(offers.valid_until, now)));
    await tx.update(subscriptions).set({ status: "expired" })
      .where(and(inArray(subscriptions.status, ["active", "past_due"]), lt(subscriptions.current_period_end, new Date(Date.now() - 3 * DAY).toISOString())));
    await tx.update(hubs).set({ status: "live" }).where(and(eq(hubs.status, "scheduled"), lt(hubs.starts_at, now), gt(hubs.ends_at, now)));
    await tx.update(hubs).set({ status: "ended" }).where(and(inArray(hubs.status, ["scheduled", "live"]), lt(hubs.ends_at, now)));
    return { expired_listings: expired.length, expired_offers: offerRes.affectedRows, expiry_warnings: warned };
  });
}

/** Compact owner card for moderation screens (any staff). */
export async function ownerSummary(actor: Actor, userId: string) {
  if (!isStaff(actor)) throw forbidden();
  const [[row], [{ n }]] = await Promise.all([
    db.select({ p: profiles, email: user.email }).from(profiles).innerJoin(user, eq(user.id, profiles.id)).where(eq(profiles.id, userId)).limit(1),
    db.select({ n: sql<number>`count(*)` }).from(properties).where(eq(properties.owner_id, userId)),
  ]);
  return row ? { ...row.p, email: row.email, listing_count: Number(n) } : null;
}
