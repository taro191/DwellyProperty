/**
 * Demo data from the design prototype (local/staging only — never run on production).
 * Usage: npm run db:seed      Demo accounts: <role>@dwelly.local / Dwelly@1234
 * Production test accounts: npm run seed:test (scripts/seed-test.ts) — same data, other emails and a random password.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/server/db";
import * as t from "@/server/db/schema";
import type { LandDetailsJson } from "@/server/db/schema";
import { seedActivity } from "./seed-activity";

const DAY = 86_400_000;
const iso = (ms = 0) => new Date(Date.now() + ms).toISOString();
const PASSWORD = "Dwelly@1234";

type Src = {
  zones: { id: string; icon: string; name: string; desc: string }[];
  plans: { id: string; name: string; badge?: string; price: number; desc?: string; features?: string[] }[];
  boosts: { id: string; name: string; price: number; desc?: string }[];
  properties: {
    id: string; name: string; location: string; price?: number; rentPrice?: number; size: number; bedrooms?: number; image?: string;
    tags?: string[]; verified?: boolean; featured?: boolean; isBoosted?: boolean; sellerType?: string; propertyCategory?: string;
    landDetails?: Record<string, unknown>; floor?: number; direction?: string; furniture?: string; maintenanceFee?: number;
    availability?: string; views?: number; saves?: number; interests?: number; hasDwellyCommission?: boolean;
    commissionBaseRate?: number; podCode?: string; sellerName?: string; createdAt?: string;
  }[];
};

const USERS = [
  ["admin", "admin@dwelly.local", "Dwelly Admin", "buyer"],
  ["moderator", "moderator@dwelly.local", "ทีมตรวจสอบ Dwelly", "buyer"],
  ["owner", "owner@dwelly.local", "พัชริดา (เจ้าของทรัพย์)", "owner"],
  ["agent", "agent@dwelly.local", "วรภพ ชัยสิทธิ์", "agent"],
  ["buyer", "buyer@dwelly.local", "ณัฐนนท์ (ผู้ซื้อทดสอบ)", "buyer"],
  ["owner2", "owner2@dwelly.local", "คุณนพดล (เจ้าของบ้านให้เช่า)", "owner"],
  ["tenant", "tenant@dwelly.local", "กมลชนก (ผู้เช่าทดสอบ)", "tenant"],
  ["investor", "investor@dwelly.local", "ธนกฤต (นักลงทุนทดสอบ)", "investor"],
  ["verifier", "verifier@dwelly.local", "ทีมตรวจเอกสาร Dwelly", "buyer"],
  ["support", "support@dwelly.local", "ทีมซัพพอร์ต Dwelly", "buyer"],
  ["finance", "finance@dwelly.local", "ทีมการเงิน Dwelly", "buyer"],
] as const;

export interface SeedOptions {
  /** Email for a user key (default `<key>@dwelly.local`). */
  email?: (key: string) => string;
  password?: string;
  /** Also create sample activity (inquiries, chats, orders, review queues…). Default true. */
  activity?: boolean;
}

const GEO: [RegExp, string, string, number, number][] = [
  [/Asoke|อโศก/, "กรุงเทพมหานคร", "วัฒนา", 13.7376, 100.5604],
  [/อารีย์/, "กรุงเทพมหานคร", "พญาไท", 13.7797, 100.5446],
  [/นิมมาน/, "เชียงใหม่", "เมืองเชียงใหม่", 18.7984, 98.9677],
  [/สันทราย/, "เชียงใหม่", "สันทราย", 18.85, 99.04],
  [/แม่ออน/, "เชียงใหม่", "แม่ออน", 18.86, 99.25],
  [/บางเทา/, "ภูเก็ต", "ถลาง", 7.995, 98.295],
  [/ป่าตอง/, "ภูเก็ต", "กะทู้", 7.8961, 98.2964],
  [/จอมเทียน/, "ชลบุรี", "บางละมุง", 12.8806, 100.8778],
  [/บางเสร่/, "ชลบุรี", "สัตหีบ", 12.75, 100.91],
  [/ขอนแก่น/, "ขอนแก่น", "เมืองขอนแก่น", 16.4614, 102.8236],
  [/Thawi/, "กรุงเทพมหานคร", "ทวีวัฒนา", 13.78, 100.35],
  [/Maha Sawat/, "นครปฐม", "พุทธมณฑล", 13.82, 100.33],
  [/./, "นครปฐม", "พุทธมณฑล", 13.7946, 100.3237],
];
const FURN: Record<string, "full" | "partial" | "unfurnished"> = { "Fully Furnished": "full", "Partially Furnished": "partial", Unfurnished: "unfurnished" };
const DIR: Record<string, (typeof t.DIRECTIONS)[number]> = { North: "N", South: "S", East: "E", West: "W", Northeast: "NE", Northwest: "NW", Southeast: "SE", Southwest: "SW", "North-East": "NE", "North-West": "NW", "South-East": "SE", "South-West": "SW" };
const ZONE_SLUG: Record<string, string> = { "z-land": "land", z1: "near-mahidol", z2: "move-in-ready", z3: "investment", z4: "under-2m", z5: "owner-direct", z6: "pod-picks" };
const QUOTAS: Record<string, Record<string, unknown>> = {
  "owner-free": { active_listings: 1 }, "owner-pro": { active_listings: 5, free_boosts_per_month: 1 }, "owner-vip": { active_listings: 20, free_boosts_per_month: 4 },
  "agent-starter": { active_listings: 15 }, "agency-pro": { active_listings: 100, seats: 10 }, "agency-enterprise": {}, "inv-club": { deal_alerts: true }, "inv-elite": { deal_alerts: true, advisor: true },
};
const BOOST: Record<string, [number, string]> = { "boost-24h": [1, "top_rank"], "boost-7d": [7, "hot_deal"], "boost-spotlight": [14, "spotlight_banner"], "boost-combo": [30, "featured"] };

export async function seed(opts: SeedOptions = {}) {
  const emailFor = opts.email ?? ((key: string) => `${key}@dwelly.local`);
  const src = JSON.parse(readFileSync(path.join(process.cwd(), "scripts", "seed-data.json"), "utf8")) as Src;
  const [existing] = await db.select({ id: t.user.id }).from(t.user).where(eq(t.user.email, emailFor("admin"))).limit(1);
  if (existing) {
    console.log("seed: demo data already present — skipping");
    return;
  }

  // Users + credential accounts hashed with the Better Auth hasher (same as real sign-ups).
  const U: Record<string, string> = {};
  const hash = await hashPassword(opts.password ?? PASSWORD);
  for (const [key, , name, role] of USERS) {
    const email = emailFor(key);
    const id = crypto.randomUUID();
    const now = new Date();
    U[key] = id;
    await db.insert(t.user).values({ id, email, name, emailVerified: true, createdAt: now, updatedAt: now });
    await db.insert(t.account).values({ id: crypto.randomUUID(), userId: id, accountId: id, providerId: "credential", password: hash, createdAt: now, updatedAt: now });
    await db.insert(t.profiles).values({ id, display_name: name, primary_role: role, onboarded_at: iso() });
    await db.insert(t.user_roles).values([...new Set<(typeof t.APP_ROLES)[number]>(["buyer", role])].map((r) => ({ user_id: id, role: r })));
    for (const kind of ["terms", "privacy"] as const) await db.insert(t.consents).values({ user_id: id, kind, version: "2026-10-01", granted: true });
  }
  await db.insert(t.staff_members).values([
    { user_id: U.admin, role: "super_admin" }, { user_id: U.moderator, role: "moderator" },
    { user_id: U.verifier, role: "verifier" }, { user_id: U.support, role: "support" }, { user_id: U.finance, role: "finance" },
  ]);
  await db.update(t.profiles).set({ phone: "081-888-9922", phone_verified: true, line_id: "worapop.agent", is_kyc_verified: true, kyc_verified_at: iso() }).where(eq(t.profiles.id, U.agent));
  await db.update(t.profiles).set({ phone: "089-222-3344", line_id: "patcharida", is_kyc_verified: true, kyc_verified_at: iso() }).where(eq(t.profiles.id, U.owner));
  await db.update(t.profiles).set({ phone: "084-555-1234" }).where(eq(t.profiles.id, U.owner2));
  await db.update(t.profiles).set({ phone: "086-111-2233", bio: "นักศึกษาปริญญาโท หาคอนโดใกล้ ม.มหิดล" }).where(eq(t.profiles.id, U.tenant));
  await db.update(t.profiles).set({ phone: "082-777-8899", line_id: "thanakrit.inv", is_kyc_verified: true, kyc_verified_at: iso(), bio: "ลงทุนที่ดินและคอนโดปล่อยเช่า" }).where(eq(t.profiles.id, U.investor));
  await db.insert(t.agent_profiles).values({
    user_id: U.agent, agent_code: "AG1001", english_name: "Worapop Chaisit", title: "Senior Certified Real Estate Specialist",
    company_name: "Salaya Prime Estate", license_no: "TREBA-2025-0148", license_verified: true, experience_years: 8,
    specialized_categories: ["condo", "land"], rating_avg: 4.95, rating_count: 36, closed_deals: 48,
  });
  await db.insert(t.counters).values({ name: "agent_code", value: 1001 }).onDuplicateKeyUpdate({ set: { value: 1001 } });

  // Zones, plans, boosts
  const zoneIds: Record<string, string> = {};
  let i = 0;
  for (const z of src.zones) {
    const slug = ZONE_SLUG[z.id];
    if (!slug) continue;
    const id = crypto.randomUUID();
    zoneIds[slug] = id;
    const en = /\(([^)]+)\)/.exec(z.name)?.[1] ?? z.name;
    await db.insert(t.zones).values({ id, slug, name_th: z.name, name_en: en, icon: z.icon, description: z.desc, sort_order: i++,
      ...(slug === "near-mahidol" ? { center_lat: 13.7946, center_lng: 100.3237 } : {}) });
  }
  await db.insert(t.plans).values(src.plans.map((p, idx) => ({
    id: p.id, audience: p.id.startsWith("owner") ? "owner" as const : p.id.startsWith("inv") ? "investor" as const : "agent" as const,
    name: p.name, badge: p.badge ?? null, description: p.desc ?? null, price_thb: p.price, period: p.price === 0 ? "lifetime" as const : "month" as const,
    features: p.features ?? [], quotas: QUOTAS[p.id] ?? {}, sort_order: idx,
  })));
  await db.insert(t.boost_products).values(src.boosts.map((b, idx) => ({
    id: b.id, name: b.name, description: b.desc ?? null, price_thb: b.price, duration_days: BOOST[b.id][0], placement: BOOST[b.id][1], sort_order: idx,
  })));

  const podId = crypto.randomUUID();
  await db.insert(t.agency_pods).values({
    id: podId, code: "POD-SLY-01", name: "Salaya Prime Estate Pod", description: "ทีมนายหน้าที่ผ่านการยืนยันในโซนศาลายา",
    zone_id: zoneIds["near-mahidol"], leader_id: U.agent, status: "verified", trust_score: 92, insurance_coverage: 10_000_000,
    verifications: { license_verified: true, identity_verified: true, escrow_ready: true, zero_markup_guaranteed: true, background_checked: true },
    rating_avg: 4.95, rating_count: 36,
  });
  await db.insert(t.pod_members).values({ pod_id: podId, user_id: U.agent, role: "leader" });

  // Listings
  let n = 0;
  for (const p of src.properties) {
    const g = GEO.find(([re]) => re.test(`${p.location} ${p.name}`))!;
    const cat = (p.propertyCategory ?? "condo") as (typeof t.CATEGORIES)[number];
    const land = cat === "land";
    const lt = land ? "sale" : p.rentPrice && p.price ? "sale_or_rent" : p.rentPrice ? "rent" : "sale";
    const L = p.landDetails as Record<string, unknown> | undefined;
    const ld: LandDetailsJson = L ? {
      rai: L.rai as number, ngan: L.ngan as number, sq_wa: L.sqWa as number, deed_type: L.titleDeedType as string, zoning: L.zoningColor as string,
      road_frontage_m: L.roadFrontageMeters as number, road_type: L.roadType as string, shape: L.landShape as string,
      utilities: L.utilities as string[], suitable_for: L.suitableFor as string[], price_per_sqwa: L.pricePerSqWa as number,
    } : {};
    const zone = land ? "land" : /Mahidol|มหิดล/.test(p.name + p.location + (p.tags ?? []).join()) ? "near-mahidol" : null;
    const id = crypto.randomUUID();
    const created = p.createdAt ?? "2026-09-15T08:00:00.000Z";
    n++;
    await db.insert(t.properties).values({
      id, code: `DW${String(1000 + n).padStart(6, "0")}`,
      owner_id: /นพดล/.test(p.sellerName ?? "") ? U.owner2 : U.owner, agent_id: p.sellerType === "agency" ? U.agent : null,
      pod_id: p.podCode === "POD-SLY-01" ? podId : null, zone_id: zone ? zoneIds[zone] : null,
      listing_type: lt, category: cat, status: "active", title: p.name,
      description: p.availability ? `สถานะ: ${p.availability}` : null,
      sale_price: lt === "rent" ? null : p.price, rent_price: lt === "sale" ? null : p.rentPrice,
      usable_area_sqm: land ? null : p.size, land_area_sqwa: land ? ((L?.totalSqWa as number) ?? Math.round(p.size / 4)) : null,
      bedrooms: land ? null : (p.bedrooms ?? null), bathrooms: land ? null : Math.max(1, p.bedrooms ?? 1),
      floor: p.floor ?? null, direction: (p.direction && DIR[p.direction]) || null, furnishing: p.furniture ? (FURN[p.furniture] ?? "partial") : null,
      maintenance_fee: p.maintenanceFee ?? null, land_details: ld, tags: p.tags ?? [],
      province: g[1], district: g[2], address_line: p.location,
      lat: Number((g[3] + (((n * 37) % 11) - 5) / 1000).toFixed(5)), lng: Number((g[4] + (((n * 53) % 13) - 6) / 1000).toFixed(5)),
      is_verified: Boolean(p.verified), verified_at: p.verified ? iso() : null,
      featured_until: p.featured || p.isBoosted ? iso(14 * DAY) : null,
      views_count: p.views ?? 0, saves_count: p.saves ?? 0, inquiries_count: p.interests ?? 0,
      published_at: created, expires_at: iso(90 * DAY), created_at: created,
    });
    if (p.image) await db.insert(t.property_media).values({ property_id: id, kind: "image", external_url: p.image, sort_order: 0 });
    if (p.hasDwellyCommission) {
      await db.insert(t.commission_programs).values({ property_id: id, sale_rate_pct: 3, rent_month1_rate_pct: p.commissionBaseRate ?? 100, rent_month2_rate_pct: 50, rent_month3_plus_rate_pct: 25, renewal_rate_pct: 25 });
    }
  }
  await db.insert(t.counters).values({ name: "property_code", value: 1000 + n }).onDuplicateKeyUpdate({ set: { value: 1000 + n } });

  // Hub + activities
  const hubId = crypto.randomUUID();
  await db.insert(t.hubs).values({ id: hubId, slug: "salaya-move-in-2026", name: "Salaya Move-in Festival", theme: "ฤดูเปิดเทอม",
    description: "รวมคอนโดและบ้านเช่าใกล้ ม.มหิดล ราคาพิเศษ", zone_id: zoneIds["near-mahidol"], status: "live", starts_at: iso(-3 * DAY), ends_at: iso(14 * DAY) });
  const hubProps = await db.select({ id: t.properties.id }).from(t.properties).where(eq(t.properties.zone_id, zoneIds["near-mahidol"]));
  if (hubProps.length) await db.insert(t.hub_properties).values(hubProps.map((p) => ({ hub_id: hubId, property_id: p.id })));
  await db.insert(t.activities).values([
    { host_id: U.agent, type: "live_tour", title: "Live Video Tour — Aspire Salaya", description: "ทัวร์ห้องจริงผ่านวิดีโอ ถามตอบสด", starts_at: iso(DAY), seats: 50, status: "published", hub_id: hubId },
    { host_id: U.agent, type: "live_qa", title: "Ask the Owner Live Q&A", description: "คุยตรงกับเจ้าของทรัพย์", starts_at: iso(3 * DAY), seats: 30, status: "published" },
    { type: "workshop", title: "Land & Condo Buying Consultation", description: "เวิร์กช็อปซื้อที่ดินและคอนโดครั้งแรก", starts_at: iso(7 * DAY), seats: 40, status: "published" },
  ]);
  await db.insert(t.app_settings).values([
    { key: "listing_duration_days", value: 90 },
    { key: "support_contact", value: { line_oa: "@dwelly", email: "support@dwelly.co" } },
  ]);
  if (opts.activity !== false) await seedActivity(U);
  console.log(`seed: ${USERS.length} users, ${n} listings, ${Object.keys(zoneIds).length} zones, ${src.plans.length} plans`);
  return U;
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed().then(() => process.exit(0), (e) => {
    console.error(e);
    process.exit(1);
  });
}
