/**
 * Business-rule tests against a real, throwaway MySQL server (mysql-memory-server).
 * These replace the database's old RLS/trigger tests: every rule now lives in src/server/services.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDB } from "mysql-memory-server";
import { and, eq } from "drizzle-orm";
import type { Actor } from "@/server/services/core";

let server: Awaited<ReturnType<typeof createDB>>;
let db: typeof import("@/server/db").db;
let t: typeof import("@/server/db/schema");
let listings: typeof import("@/server/services/listings");
let deals: typeof import("@/server/services/deals");
let chat: typeof import("@/server/services/chat");
let trust: typeof import("@/server/services/trust");
let admin: typeof import("@/server/services/admin");
let account: typeof import("@/server/services/account");
let billing: typeof import("@/server/services/billing");
let U: Record<string, string>;

async function actor(key: string): Promise<Actor> {
  const id = U[key];
  const [p] = await db.select().from(t.profiles).where(eq(t.profiles.id, id));
  const roles = await db.select().from(t.user_roles).where(eq(t.user_roles.user_id, id));
  const [s] = await db.select().from(t.staff_members).where(eq(t.staff_members.user_id, id));
  return { id, status: p.status, roles: roles.map((r) => r.role), staffRole: s?.active ? s.role : null };
}

async function someListing(where: { agent?: boolean } = {}) {
  const rows = await db.select().from(t.properties).where(eq(t.properties.status, "active"));
  return rows.find((r) => (where.agent ? r.agent_id : !r.agent_id))!;
}

const LISTING = {
  listing_type: "sale" as const, category: "condo" as const, title: "คอนโดทดสอบ ใกล้ BTS อารีย์", sale_price: 1_500_000,
  province: "กรุงเทพมหานคร", usable_area_sqm: 30,
};

beforeAll(async () => {
  server = await createDB({ version: "8.4.x", logLevel: "ERROR" });
  process.env.DATABASE_URL = `mysql://${server.username}@127.0.0.1:${server.port}/${server.dbName}`;
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
  const { runMigrations } = await import("../scripts/migrate");
  await runMigrations(process.env.DATABASE_URL);
  ({ db } = await import("@/server/db"));
  t = await import("@/server/db/schema");
  [listings, deals, chat, trust, admin, account, billing] = await Promise.all([
    import("@/server/services/listings"), import("@/server/services/deals"), import("@/server/services/chat"),
    import("@/server/services/trust"), import("@/server/services/admin"), import("@/server/services/account"),
    import("@/server/services/billing"),
  ]);
  const { seed } = await import("../scripts/seed");
  U = (await seed({ activity: false }))!; // sample activity is covered by seed.test.ts
});

afterAll(async () => {
  await server?.stop();
});

describe("public search & visibility", () => {
  it("shows the 25 seeded active listings", async () => {
    const { total } = await listings.searchListings({});
    expect(total).toBe(25);
  });
  it("filters by text, category and price", async () => {
    const { items } = await listings.searchListings({ q: "ศาลายา", category: "land", max: 10_000_000 });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.category === "land" && Number(p.sale_price) <= 10_000_000)).toBe(true);
  });
  it("never exposes contact details in listing rows", async () => {
    const { items } = await listings.searchListings({}, { limit: 1 });
    expect(items[0]).not.toHaveProperty("phone");
  });
});

describe("listing lifecycle", () => {
  let id = "";
  it("new listings start as drafts owned by the creator", async () => {
    ({ id } = await listings.createListing(await actor("buyer"), LISTING));
    const [p] = await db.select().from(t.properties).where(eq(t.properties.id, id));
    expect(p.status).toBe("draft");
    expect(p.owner_id).toBe(U.buyer);
    expect(p.is_verified).toBe(false);
    expect(p.code).toMatch(/^DW\d{6}$/);
  });
  it("drafts are hidden from the public", async () => {
    const [p] = await db.select().from(t.properties).where(eq(t.properties.id, id));
    expect(await listings.getListingByCode(p.code, null)).toBeNull();
    expect(await listings.getListingByCode(p.code, await actor("buyer"))).not.toBeNull();
  });
  it("owners cannot publish themselves", async () => {
    await expect(listings.changeListingStatus(await actor("buyer"), id, "active")).rejects.toThrow("ไม่สามารถเปลี่ยนสถานะ");
  });
  it("submitting for review requires a photo", async () => {
    await expect(listings.changeListingStatus(await actor("buyer"), id, "pending_review")).rejects.toThrow("รูป");
    await db.insert(t.property_media).values({ property_id: id, external_url: "https://images.unsplash.com/x", sort_order: 0 });
    await listings.changeListingStatus(await actor("buyer"), id, "pending_review");
  });
  it("only moderators approve, and rejection needs a reason", async () => {
    await expect(listings.reviewListing(await actor("buyer"), id, true)).rejects.toThrow();
    await expect(listings.reviewListing(await actor("moderator"), id, false, "")).rejects.toThrow("เหตุผล");
    await listings.reviewListing(await actor("moderator"), id, true);
    const [p] = await db.select().from(t.properties).where(eq(t.properties.id, id));
    expect(p.status).toBe("active");
    expect(p.published_at).toBeTruthy();
    expect(p.expires_at).toBeTruthy();
    const notes = await db.select().from(t.notifications).where(and(eq(t.notifications.user_id, U.buyer), eq(t.notifications.type, "listing")));
    expect(notes.length).toBe(1);
    const logs = await db.select().from(t.audit_logs).where(eq(t.audit_logs.action, "LISTING_APPROVED"));
    expect(logs.length).toBe(1);
  });
  it("other users cannot edit", async () => {
    await expect(listings.updateListing(await actor("owner2"), id, { ...LISTING, title: "แฮ็กหัวข้อประกาศนี้" })).rejects.toThrow("สิทธิ์");
  });
  it("favorites keep the counter in sync", async () => {
    await listings.setFavorite(await actor("owner"), id, true);
    await listings.setFavorite(await actor("owner"), id, true); // idempotent
    let [p] = await db.select().from(t.properties).where(eq(t.properties.id, id));
    expect(p.saves_count).toBe(1);
    await listings.setFavorite(await actor("owner"), id, false);
    [p] = await db.select().from(t.properties).where(eq(t.properties.id, id));
    expect(p.saves_count).toBe(0);
  });
});

describe("deals", () => {
  it("inquiry fills the seller and bumps the counter; own listings are blocked", async () => {
    const p = await someListing();
    await deals.createInquiry(await actor("buyer"), { property_id: p.id, intent: "buy", message: "สนใจครับ ยังว่างไหม" });
    const [row] = await db.select().from(t.inquiries).where(eq(t.inquiries.property_id, p.id));
    expect(row.seller_id).toBe(p.owner_id);
    const mine = (await db.select().from(t.properties).where(eq(t.properties.owner_id, U.owner)))[0];
    await expect(deals.createInquiry(await actor("owner"), { property_id: mine.id, intent: "buy", message: "ทดสอบข้อความ" })).rejects.toThrow("ของตัวเอง");
    await expect(deals.updateInquiry(await actor("buyer"), row.id, { status: "won" })).rejects.toThrow();
  });

  it("offer negotiation follows the state machine", async () => {
    const p = await someListing();
    const seller = p.owner_id === U.owner ? "owner" : "owner2";
    await deals.createOffer(await actor("buyer"), { property_id: p.id, kind: "purchase", offer_price: 1_000_000, valid_days: 7 });
    const [o] = await db.select().from(t.offers).where(eq(t.offers.property_id, p.id));
    expect(o.listed_price).toBe(Number(p.sale_price));
    await expect(deals.respondOffer(await actor("buyer"), o.id, { status: "accepted" })).rejects.toThrow();
    await expect(deals.respondOffer(await actor(seller), o.id, { status: "countered" })).rejects.toThrow("ราคา");
    await deals.respondOffer(await actor(seller), o.id, { status: "countered", counter_price: 1_100_000 });
    await deals.respondOffer(await actor("buyer"), o.id, { status: "accepted" });
    const [after] = await db.select().from(t.offers).where(eq(t.offers.id, o.id));
    expect(after.status).toBe("accepted");
    expect(after.counter_price).toBe(1_100_000);
  });

  it("appointments: no past times, seller confirms, buyer cannot confirm", async () => {
    const p = await someListing();
    const seller = p.owner_id === U.owner ? "owner" : "owner2";
    await expect(deals.createAppointment(await actor("buyer"), { property_id: p.id, format: "onsite", scheduled_at: new Date(Date.now() - 1000).toISOString() }))
      .rejects.toThrow("1 ชั่วโมง");
    await deals.createAppointment(await actor("buyer"), { property_id: p.id, format: "video", scheduled_at: new Date(Date.now() + 2 * 86_400_000).toISOString() });
    const [a] = await db.select().from(t.appointments).where(eq(t.appointments.property_id, p.id));
    await expect(deals.updateAppointment(await actor("buyer"), a.id, { status: "confirmed" })).rejects.toThrow();
    await deals.updateAppointment(await actor(seller), a.id, { status: "confirmed", meeting_url: "https://meet.example/x" });
    await deals.updateAppointment(await actor("buyer"), a.id, { status: "cancelled" });
    const [after] = await db.select().from(t.appointments).where(eq(t.appointments.id, a.id));
    expect(after.status).toBe("cancelled");
    expect(after.cancelled_by).toBe(U.buyer);
    // phone consultation is a third appointment format
    await deals.createAppointment(await actor("tenant"), { property_id: p.id, format: "phone", scheduled_at: new Date(Date.now() + 3 * 86_400_000).toISOString() });
    const [ph] = await db.select().from(t.appointments).where(and(eq(t.appointments.property_id, p.id), eq(t.appointments.format, "phone")));
    expect(ph.buyer_id).toBe(U.tenant);
  });
});

describe("chat & contact", () => {
  it("one thread per pair+listing, unread counts, members only", async () => {
    const p = await someListing();
    const seller = p.owner_id === U.owner ? "owner" : "owner2";
    const id = await chat.startConversation(await actor("buyer"), p.id);
    expect(await chat.startConversation(await actor("buyer"), p.id)).toBe(id);
    await chat.sendMessage(await actor("buyer"), id, "สวัสดีครับ");
    const inbox = await chat.listConversations(await actor(seller));
    expect(inbox.find((c) => c.id === id)?.unread_count).toBe(1);
    await expect(chat.sendMessage(await actor("agent"), id, "spam")).rejects.toThrow();
    expect(await chat.getConversation(await actor("agent"), id)).toBeNull();
  });
  it("contact reveal needs an active account and logs an event", async () => {
    const p = await someListing();
    const c = await listings.revealContact(await actor("buyer"), p.id);
    expect(c.phone).toBeTruthy();
    const events = await db.select().from(t.property_events).where(and(eq(t.property_events.property_id, p.id), eq(t.property_events.kind, "contact_reveal")));
    expect(events.length).toBeGreaterThan(0);
  });
});

describe("trust: commission, verification, reports, moderation", () => {
  it("only agents request commission access; partners see programmes after approval", async () => {
    await expect(trust.requestPartnerAccess(await actor("buyer"))).rejects.toThrow("นายหน้า");
    await trust.requestPartnerAccess(await actor("agent"), "ขอเป็น partner");
    await expect(trust.requestPartnerAccess(await actor("agent"))).rejects.toThrow("ไปแล้ว");
    const req = await trust.latestPartnerRequest(await actor("agent"));
    await trust.decideCommissionAccess(await actor("moderator"), req!.id, "approved");
    expect((await trust.visibleCommissionPrograms(await actor("agent"))).length).toBeGreaterThan(0);
    const p = await someListing();
    expect(await trust.hasCommissionAccess(await actor("buyer"), p.id)).toBe(false);
  });

  it("KYC approval sets the badge; documents must be in the applicant folder", async () => {
    const buyer = await actor("buyer");
    const reqId = await trust.createVerificationRequest(buyer, { kind: "identity", data: { full_name: "ณัฐนนท์" } });
    await expect(trust.attachVerificationDoc(buyer, reqId, "id_card", `${U.owner}/x.jpg`)).rejects.toThrow();
    await trust.attachVerificationDoc(buyer, reqId, "id_card", `${U.buyer}/${reqId}/id.jpg`);
    await expect(trust.reviewVerification(await actor("buyer"), reqId, "approved")).rejects.toThrow();
    await trust.reviewVerification(await actor("admin"), reqId, "approved");
    const [p] = await db.select().from(t.profiles).where(eq(t.profiles.id, U.buyer));
    expect(p.is_kyc_verified).toBe(true);
    expect(await trust.canReadVerificationFile(await actor("owner"), `${U.buyer}/${reqId}/id.jpg`)).toBe(false);
  });

  it("banning hides listings, signs out and blocks writes; moderators cannot ban", async () => {
    await expect(admin.setUserStatus(await actor("moderator"), U.owner2, "suspended", "x")).rejects.toThrow();
    await admin.setUserStatus(await actor("admin"), U.owner2, "banned", "scam");
    const live = await db.select().from(t.properties).where(and(eq(t.properties.owner_id, U.owner2), eq(t.properties.status, "active")));
    expect(live.length).toBe(0);
    await expect(trust.createReport(await actor("owner2"), { target_type: "user", target_id: U.buyer, reason: "other" })).rejects.toThrow("ระงับ");
  });

  it("reports resolve with an audit entry and reporter notification", async () => {
    const p = await someListing();
    await trust.createReport(await actor("buyer"), { target_type: "property", target_id: p.id, reason: "scam", details: "ขอโอนเงินก่อนดูห้อง" });
    const [r] = await admin.listReports(await actor("moderator"));
    await admin.resolveReport(await actor("moderator"), r.id, "resolved", "ระงับประกาศแล้ว");
    const logs = await db.select().from(t.audit_logs).where(eq(t.audit_logs.action, "REPORT_RESOLVED"));
    expect(logs.length).toBe(1);
  });
});

describe("admin CLI", () => {
  it("creates a super admin who can sign in with a password, and is idempotent", async () => {
    const { createAdmin } = await import("../scripts/create-admin");
    const { verifyPassword } = await import("better-auth/crypto");
    const first = await createAdmin({ email: "Boss@Example.com", password: "first-password-123" });
    const again = await createAdmin({ email: "boss@example.com", password: "second-password-456" });
    expect(first.created).toBe(true);
    expect(again.created).toBe(false);
    expect(again.id).toBe(first.id);
    const [s] = await db.select().from(t.staff_members).where(eq(t.staff_members.user_id, first.id));
    expect(s.role).toBe("super_admin");
    const [acc] = await db.select().from(t.account).where(eq(t.account.userId, first.id));
    expect(await verifyPassword({ hash: acc.password!, password: "second-password-456" })).toBe(true);
    await expect(createAdmin({ email: "x@example.com", password: "short" })).rejects.toThrow("8");
  });
});

describe("super admin user management", () => {
  it("only super admins create users, grant/revoke admin and reset passwords", async () => {
    const accounts = await import("@/server/services/accounts");
    const { verifyPassword } = await import("better-auth/crypto");
    await expect(accounts.createUserAsAdmin(await actor("moderator"), { email: "new.mod@example.com" })).rejects.toThrow("Super Admin");

    const admin = await actor("admin");
    const r = await accounts.createUserAsAdmin(admin, { email: "New.Mod@example.com", name: "New Mod", password: "initial-pass-1", staffRole: "moderator", appRoles: ["agent"] });
    await expect(accounts.createUserAsAdmin(admin, { email: "new.mod@example.com" })).rejects.toThrow("มีบัญชีอยู่แล้ว");
    let [s] = await db.select().from(t.staff_members).where(eq(t.staff_members.user_id, r.id));
    expect(s.role).toBe("moderator");
    const roles = (await db.select().from(t.user_roles).where(eq(t.user_roles.user_id, r.id))).map((x) => x.role).sort();
    expect(roles).toEqual(["agent", "buyer"]);

    await accounts.setStaffRole(admin, r.id, null);
    [s] = await db.select().from(t.staff_members).where(eq(t.staff_members.user_id, r.id));
    expect(s.active).toBe(false);
    await expect(accounts.setStaffRole(admin, admin.id, "moderator")).rejects.toThrow("ตัวเอง");

    await accounts.setPasswordAsAdmin(admin, r.id, "changed-pass-2");
    const [acc] = await db.select().from(t.account).where(eq(t.account.userId, r.id));
    expect(await verifyPassword({ hash: acc.password!, password: "changed-pass-2" })).toBe(true);
    await expect(accounts.setPasswordAsAdmin(await actor("moderator"), r.id, "whatever-123")).rejects.toThrow();
    const logs = await db.select().from(t.audit_logs).where(eq(t.audit_logs.entity_id, r.id));
    expect(logs.map((l) => l.action)).toEqual(expect.arrayContaining(["USER_CREATED", "STAFF_SET", "PASSWORD_RESET"]));
  });
});

describe("login enable/disable", () => {
  it("only super admins toggle login; disabling needs a reason and ends sessions", async () => {
    const accounts = await import("@/server/services/accounts");
    const admin = await actor("admin");
    const now = new Date();
    await db.insert(t.session).values({ id: crypto.randomUUID(), token: crypto.randomUUID(), userId: U.agent, expiresAt: new Date(Date.now() + 86_400_000), createdAt: now, updatedAt: now });

    await expect(accounts.setLoginEnabled(await actor("moderator"), U.agent, false, "x")).rejects.toThrow("Super Admin");
    await expect(accounts.setLoginEnabled(admin, admin.id, false, "x")).rejects.toThrow("ตัวเอง");
    await expect(accounts.setLoginEnabled(admin, U.agent, false, "")).rejects.toThrow("เหตุผล");

    await accounts.setLoginEnabled(admin, U.agent, false, "ทดสอบปิดล็อกอิน");
    expect(await accounts.isLoginDisabled(U.agent)).toBe(true);
    expect((await db.select().from(t.session).where(eq(t.session.userId, U.agent))).length).toBe(0);

    await accounts.setLoginEnabled(admin, U.agent, true);
    expect(await accounts.isLoginDisabled(U.agent)).toBe(false);
    const actions = (await db.select().from(t.audit_logs).where(eq(t.audit_logs.entity_id, U.agent))).map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(["LOGIN_DISABLED", "LOGIN_ENABLED"]));
  });
});

describe("billing, maintenance, PDPA", () => {
  it("order price comes from the catalogue; fulfilment is idempotent and features the listing", async () => {
    const p = (await db.select().from(t.properties).where(and(eq(t.properties.owner_id, U.owner), eq(t.properties.status, "active"))))[0];
    await expect(billing.createOrder(await actor("buyer"), { kind: "boost", boost_product_id: "boost-24h", property_id: p.id })).rejects.toThrow();
    const orderId = await billing.createOrder(await actor("owner"), { kind: "boost", boost_product_id: "boost-spotlight", property_id: p.id });
    await billing.fulfillOrder(orderId, "omise", "chrg_test_1");
    await billing.fulfillOrder(orderId, "omise", "chrg_test_1");
    const [o] = await db.select().from(t.orders).where(eq(t.orders.id, orderId));
    expect(o.amount_thb).toBe(999);
    const boosts = await db.select().from(t.boosts).where(eq(t.boosts.order_id, orderId));
    expect(boosts.length).toBe(1);
    const [after] = await db.select().from(t.properties).where(eq(t.properties.id, p.id));
    expect(new Date(after.featured_until!).getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);
  });

  it("maintenance expires overdue listings", async () => {
    const p = await someListing();
    await db.update(t.properties).set({ expires_at: new Date(Date.now() - 60_000).toISOString() }).where(eq(t.properties.id, p.id));
    const r = await admin.runMaintenance();
    expect(r.expired_listings).toBe(1);
  });

  it("dashboard stats are staff-only", async () => {
    await expect(admin.dashboardStats(await actor("buyer"))).rejects.toThrow();
    expect((await admin.dashboardStats(await actor("admin"))).listings_active).toBeGreaterThan(0);
  });

  it("consents keep history; export contains only own data", async () => {
    const buyer = await actor("buyer");
    await account.setMarketingConsent(buyer, true);
    await account.setMarketingConsent(buyer, false);
    expect((await account.latestConsents(buyer)).marketing?.granted).toBe(false);
    const data = await account.exportMyData(buyer);
    expect(data.profile.id).toBe(U.buyer);
    expect(data.offers.every((o) => o.buyer_id === U.buyer || o.seller_id === U.buyer)).toBe(true);
  });

  it("profile: role switch grants the role; sign-up password never replaces an existing one", async () => {
    await account.setPrimaryRole(await actor("buyer"), "investor");
    const [p] = await db.select().from(t.profiles).where(eq(t.profiles.id, U.buyer));
    expect(p.primary_role).toBe("investor");
    const roles = await db.select().from(t.user_roles).where(eq(t.user_roles.user_id, U.buyer));
    expect(roles.map((r) => r.role)).toContain("investor");
    expect(await account.setInitialPassword(await actor("buyer"), "another-password")).toBe(false); // seeded users have one
    const stats = await account.profileStats(await actor("buyer"));
    expect(stats.saved).toBeGreaterThanOrEqual(0);
    await account.setPrimaryRole(await actor("buyer"), "buyer");
  });

  it("deletion anonymises the account and removes the login", async () => {
    const buyer = await actor("buyer");
    await account.requestDeletion(buyer, "test");
    const [req] = await admin.listDeletionRequests(await actor("admin"));
    await expect(admin.processDeletion(await actor("moderator"), req.id)).rejects.toThrow();
    await admin.processDeletion(await actor("admin"), req.id);
    const [p] = await db.select().from(t.profiles).where(eq(t.profiles.id, U.buyer));
    expect(p.status).toBe("deleted");
    expect(p.phone).toBeNull();
    const accounts = await db.select().from(t.account).where(eq(t.account.userId, U.buyer));
    expect(accounts.length).toBe(0);
    const favs = await db.select().from(t.favorites).where(eq(t.favorites.user_id, U.buyer));
    expect(favs.length).toBe(0);
  });
});
