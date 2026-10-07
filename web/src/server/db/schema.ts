/**
 * Dwelly MySQL schema (Drizzle). Source of truth for `drizzle/` migrations.
 *
 * Conventions
 * - IDs are UUID strings (varchar 36) generated in the app.
 * - Time columns are DATETIME(3) stored in UTC and surfaced to the app as ISO-8601 strings.
 * - Better Auth tables (user/session/account/verification) use camelCase keys as the
 *   library expects; app tables use snake_case keys that match `src/lib/types.ts`.
 * - There is no row-level security in MySQL: every read/write goes through
 *   `src/server/services/*`, which enforce ownership, roles and state transitions.
 */
import { randomUUID } from "node:crypto";
import {
  boolean, customType, date, decimal, index, int, json, mysqlEnum, mysqlTable, primaryKey, smallint, text, uniqueIndex, varchar, bigint,
} from "drizzle-orm/mysql-core";

// ---------------------------------------------------------------------------
// Column helpers
// ---------------------------------------------------------------------------
const toIso = (v: string) => (v.includes("T") ? v : v.replace(" ", "T") + "Z");
const toMysql = (v: string | Date) => (typeof v === "string" ? new Date(v) : v).toISOString().slice(0, 23).replace("T", " ");

/** DATETIME(3) in UTC <-> ISO string ("2026-10-07T04:33:36.865Z"). */
export const isoDatetime = customType<{ data: string; driverData: string }>({
  dataType: () => "datetime(3)",
  fromDriver: (v) => toIso(String(v)),
  toDriver: (v) => toMysql(v),
});
/** DATETIME(3) as Date — used by Better Auth tables, which expect Date objects. */
const dateTime = customType<{ data: Date; driverData: string }>({
  dataType: () => "datetime(3)",
  fromDriver: (v) => new Date(toIso(String(v))),
  toDriver: (v) => toMysql(v),
});

export const nowIso = () => new Date().toISOString();
const id = () => varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID());
const ref = (name: string) => varchar(name, { length: 36 });
const createdAt = (name = "created_at") => isoDatetime(name).notNull().$defaultFn(nowIso);
const updatedAt = () => isoDatetime("updated_at").notNull().$defaultFn(nowIso).$onUpdateFn(nowIso);
const money = (name: string, p = 14) => decimal(name, { precision: p, scale: 2, mode: "number" });

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const APP_ROLES = ["buyer", "tenant", "owner", "investor", "agent"] as const;
export const STAFF_ROLES = ["super_admin", "moderator", "verifier", "support", "finance"] as const;
export const ACCOUNT_STATUS = ["active", "suspended", "banned", "deleted"] as const;
export const LISTING_TYPES = ["sale", "rent", "sale_or_rent"] as const;
export const CATEGORIES = ["condo", "house", "townhome", "land", "apartment", "commercial"] as const;
export const PROPERTY_STATUS = ["draft", "pending_review", "active", "reserved", "sold", "rented", "expired", "rejected", "archived"] as const;
export const FURNISHING = ["unfurnished", "partial", "full"] as const;
export const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

// ---------------------------------------------------------------------------
// Better Auth core tables
// ---------------------------------------------------------------------------
export const user = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: dateTime("created_at").notNull(),
  updatedAt: dateTime("updated_at").notNull(),
});

export const session = mysqlTable("session", {
  id: varchar("id", { length: 36 }).primaryKey(),
  expiresAt: dateTime("expires_at").notNull(),
  token: varchar("token", { length: 191 }).notNull().unique(),
  createdAt: dateTime("created_at").notNull(),
  updatedAt: dateTime("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: ref("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [index("session_user_idx").on(t.userId)]);

export const account = mysqlTable("account", {
  id: varchar("id", { length: 36 }).primaryKey(),
  accountId: varchar("account_id", { length: 191 }).notNull(),
  providerId: varchar("provider_id", { length: 64 }).notNull(),
  userId: ref("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: dateTime("access_token_expires_at"),
  refreshTokenExpiresAt: dateTime("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: dateTime("created_at").notNull(),
  updatedAt: dateTime("updated_at").notNull(),
}, (t) => [index("account_user_idx").on(t.userId)]);

export const verification = mysqlTable("verification", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: varchar("identifier", { length: 191 }).notNull(),
  value: text("value").notNull(),
  expiresAt: dateTime("expires_at").notNull(),
  createdAt: dateTime("created_at").notNull(),
  updatedAt: dateTime("updated_at").notNull(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);

// ---------------------------------------------------------------------------
// Users, roles, staff, audit, settings
// ---------------------------------------------------------------------------
export const profiles = mysqlTable("profiles", {
  id: ref("id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  display_name: varchar("display_name", { length: 80 }).notNull().default(""),
  avatar_url: text("avatar_url"),
  bio: text("bio"),
  primary_role: mysqlEnum("primary_role", APP_ROLES).notNull().default("buyer"),
  status: mysqlEnum("status", ACCOUNT_STATUS).notNull().default("active"),
  status_reason: text("status_reason"),
  is_kyc_verified: boolean("is_kyc_verified").notNull().default(false),
  kyc_verified_at: isoDatetime("kyc_verified_at"),
  locale: mysqlEnum("locale", ["th", "en"]).notNull().default("th"),
  onboarded_at: isoDatetime("onboarded_at"),
  // Contact details (PDPA): only exposed through services, never in public queries.
  phone: varchar("phone", { length: 20 }),
  phone_verified: boolean("phone_verified").notNull().default(false),
  line_id: varchar("line_id", { length: 50 }),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [index("profiles_status_idx").on(t.status)]);

export const user_roles = mysqlTable("user_roles", {
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", APP_ROLES).notNull(),
  created_at: createdAt(),
}, (t) => [primaryKey({ columns: [t.user_id, t.role] })]);

export const staff_members = mysqlTable("staff_members", {
  user_id: ref("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", STAFF_ROLES).notNull(),
  active: boolean("active").notNull().default(true),
  created_by: ref("created_by"),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const audit_logs = mysqlTable("audit_logs", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  actor_id: ref("actor_id"),
  action: varchar("action", { length: 64 }).notNull(),
  entity_type: varchar("entity_type", { length: 64 }).notNull(),
  entity_id: varchar("entity_id", { length: 64 }),
  summary: text("summary"),
  data: json("data").$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
  created_at: createdAt(),
}, (t) => [index("audit_entity_idx").on(t.entity_type, t.entity_id), index("audit_created_idx").on(t.created_at)]);

export const app_settings = mysqlTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").notNull(),
  updated_by: ref("updated_by"),
  updated_at: updatedAt(),
});

/** Named counters for human-readable codes (DW001001, INV2026…). */
export const counters = mysqlTable("counters", {
  name: varchar("name", { length: 32 }).primaryKey(),
  value: int("value").notNull(),
});

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------
export const zones = mysqlTable("zones", {
  id: id(),
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  name_th: varchar("name_th", { length: 120 }).notNull(),
  name_en: varchar("name_en", { length: 120 }),
  icon: varchar("icon", { length: 16 }),
  description: text("description"),
  center_lat: decimal("center_lat", { precision: 9, scale: 6, mode: "number" }),
  center_lng: decimal("center_lng", { precision: 9, scale: 6, mode: "number" }),
  sort_order: int("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  created_at: createdAt(),
});

export interface LandDetailsJson {
  rai?: number; ngan?: number; sq_wa?: number; deed_type?: string; zoning?: string; road_frontage_m?: number;
  road_type?: string; shape?: string; utilities?: string[]; suitable_for?: string[]; price_per_sqwa?: number;
}

export const properties = mysqlTable("properties", {
  id: id(),
  code: varchar("code", { length: 12 }).notNull().unique(),
  owner_id: ref("owner_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  agent_id: ref("agent_id").references(() => profiles.id, { onDelete: "set null" }),
  pod_id: ref("pod_id"),
  zone_id: ref("zone_id").references(() => zones.id, { onDelete: "set null" }),
  listing_type: mysqlEnum("listing_type", LISTING_TYPES).notNull(),
  category: mysqlEnum("category", CATEGORIES).notNull(),
  status: mysqlEnum("status", PROPERTY_STATUS).notNull().default("draft"),
  rejection_reason: text("rejection_reason"),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description"),
  project_name: varchar("project_name", { length: 150 }),
  sale_price: money("sale_price"),
  rent_price: money("rent_price", 12),
  price_negotiable: boolean("price_negotiable").notNull().default(true),
  usable_area_sqm: decimal("usable_area_sqm", { precision: 10, scale: 2, mode: "number" }),
  land_area_sqwa: decimal("land_area_sqwa", { precision: 10, scale: 2, mode: "number" }),
  bedrooms: smallint("bedrooms"),
  bathrooms: smallint("bathrooms"),
  floor: smallint("floor"),
  total_floors: smallint("total_floors"),
  direction: mysqlEnum("direction", DIRECTIONS),
  furnishing: mysqlEnum("furnishing", FURNISHING),
  maintenance_fee: money("maintenance_fee", 10),
  year_built: smallint("year_built"),
  available_from: date("available_from", { mode: "string" }),
  deposit_months: decimal("deposit_months", { precision: 4, scale: 1, mode: "number" }),
  advance_months: decimal("advance_months", { precision: 4, scale: 1, mode: "number" }),
  min_lease_months: smallint("min_lease_months"),
  pets_allowed: boolean("pets_allowed"),
  land_details: json("land_details").$type<LandDetailsJson>().notNull().$defaultFn(() => ({})),
  tags: json("tags").$type<string[]>().notNull().$defaultFn(() => []),
  amenities: json("amenities").$type<string[]>().notNull().$defaultFn(() => []),
  province: varchar("province", { length: 80 }).notNull(),
  district: varchar("district", { length: 80 }),
  subdistrict: varchar("subdistrict", { length: 80 }),
  postal_code: varchar("postal_code", { length: 5 }),
  address_line: varchar("address_line", { length: 300 }),
  lat: decimal("lat", { precision: 9, scale: 6, mode: "number" }),
  lng: decimal("lng", { precision: 9, scale: 6, mode: "number" }),
  show_exact_location: boolean("show_exact_location").notNull().default(false),
  is_verified: boolean("is_verified").notNull().default(false),
  verified_at: isoDatetime("verified_at"),
  featured_until: isoDatetime("featured_until"),
  views_count: int("views_count").notNull().default(0),
  saves_count: int("saves_count").notNull().default(0),
  inquiries_count: int("inquiries_count").notNull().default(0),
  published_at: isoDatetime("published_at"),
  expires_at: isoDatetime("expires_at"),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [
  index("properties_status_idx").on(t.status, t.published_at),
  index("properties_owner_idx").on(t.owner_id),
  index("properties_agent_idx").on(t.agent_id),
  index("properties_zone_idx").on(t.zone_id),
  index("properties_search_idx").on(t.status, t.category, t.listing_type, t.province),
  index("properties_sale_idx").on(t.status, t.sale_price),
  index("properties_rent_idx").on(t.status, t.rent_price),
  index("properties_geo_idx").on(t.lat, t.lng),
  index("properties_featured_idx").on(t.featured_until),
]);

export const property_media = mysqlTable("property_media", {
  id: id(),
  property_id: ref("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  kind: mysqlEnum("kind", ["image", "video", "floorplan"]).notNull().default("image"),
  storage_path: varchar("storage_path", { length: 300 }),
  external_url: text("external_url"),
  caption: varchar("caption", { length: 200 }),
  sort_order: int("sort_order").notNull().default(0),
  created_at: createdAt(),
}, (t) => [index("media_property_idx").on(t.property_id, t.sort_order)]);

export const favorites = mysqlTable("favorites", {
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  property_id: ref("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  created_at: createdAt(),
}, (t) => [primaryKey({ columns: [t.user_id, t.property_id] }), index("favorites_property_idx").on(t.property_id)]);

export const saved_searches = mysqlTable("saved_searches", {
  id: id(),
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  filters: json("filters").$type<Record<string, unknown>>().notNull(),
  notify: boolean("notify").notNull().default(true),
  last_notified_at: isoDatetime("last_notified_at"),
  created_at: createdAt(),
}, (t) => [index("saved_searches_user_idx").on(t.user_id)]);

export const property_events = mysqlTable("property_events", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  property_id: ref("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  user_id: ref("user_id"),
  kind: mysqlEnum("kind", ["view", "contact_reveal", "share"]).notNull(),
  created_at: createdAt(),
}, (t) => [index("events_property_idx").on(t.property_id, t.created_at), index("events_user_idx").on(t.user_id, t.property_id, t.kind)]);

// ---------------------------------------------------------------------------
// Deals & messaging
// ---------------------------------------------------------------------------
export const notifications = mysqlTable("notifications", {
  id: id(),
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  link: varchar("link", { length: 300 }),
  entity_type: varchar("entity_type", { length: 40 }),
  entity_id: ref("entity_id"),
  read_at: isoDatetime("read_at"),
  created_at: createdAt(),
}, (t) => [index("notifications_user_idx").on(t.user_id, t.created_at), index("notifications_entity_idx").on(t.user_id, t.entity_id)]);

export const inquiries = mysqlTable("inquiries", {
  id: id(),
  property_id: ref("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  buyer_id: ref("buyer_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  seller_id: ref("seller_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  intent: mysqlEnum("intent", ["buy", "rent", "invest", "info"]).notNull(),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "won", "lost"]).notNull().default("new"),
  message: text("message"),
  contact_phone: varchar("contact_phone", { length: 20 }),
  budget: money("budget"),
  seller_notes: text("seller_notes"),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [index("inquiries_seller_idx").on(t.seller_id, t.created_at), index("inquiries_buyer_idx").on(t.buyer_id, t.created_at)]);

export const appointments = mysqlTable("appointments", {
  id: id(),
  property_id: ref("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  buyer_id: ref("buyer_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  seller_id: ref("seller_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  format: mysqlEnum("format", ["onsite", "video"]).notNull().default("onsite"),
  scheduled_at: isoDatetime("scheduled_at").notNull(),
  duration_min: smallint("duration_min").notNull().default(45),
  status: mysqlEnum("status", ["pending", "confirmed", "declined", "cancelled", "completed", "no_show"]).notNull().default("pending"),
  buyer_note: text("buyer_note"),
  seller_note: text("seller_note"),
  meeting_url: varchar("meeting_url", { length: 500 }),
  cancelled_by: ref("cancelled_by"),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [index("appointments_seller_idx").on(t.seller_id, t.scheduled_at), index("appointments_buyer_idx").on(t.buyer_id, t.scheduled_at)]);

export const offers = mysqlTable("offers", {
  id: id(),
  property_id: ref("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  buyer_id: ref("buyer_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  seller_id: ref("seller_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  kind: mysqlEnum("kind", ["purchase", "rent"]).notNull(),
  listed_price: money("listed_price").notNull(),
  offer_price: money("offer_price").notNull(),
  counter_price: money("counter_price"),
  buyer_note: text("buyer_note"),
  seller_note: text("seller_note"),
  valid_until: isoDatetime("valid_until").notNull(),
  status: mysqlEnum("status", ["pending", "countered", "accepted", "rejected", "withdrawn", "expired"]).notNull().default("pending"),
  responded_at: isoDatetime("responded_at"),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [index("offers_seller_idx").on(t.seller_id, t.created_at), index("offers_buyer_idx").on(t.buyer_id, t.created_at)]);

export const conversations = mysqlTable("conversations", {
  id: id(),
  property_id: ref("property_id").references(() => properties.id, { onDelete: "set null" }),
  created_by: ref("created_by"),
  last_message_at: isoDatetime("last_message_at"),
  last_message_preview: varchar("last_message_preview", { length: 160 }),
  created_at: createdAt(),
});

export const conversation_participants = mysqlTable("conversation_participants", {
  conversation_id: ref("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  last_read_at: isoDatetime("last_read_at"),
  archived: boolean("archived").notNull().default(false),
  joined_at: createdAt("joined_at"),
}, (t) => [primaryKey({ columns: [t.conversation_id, t.user_id] }), index("participants_user_idx").on(t.user_id)]);

export const messages = mysqlTable("messages", {
  id: id(),
  conversation_id: ref("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  sender_id: ref("sender_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  body: text("body"),
  attachment_path: varchar("attachment_path", { length: 300 }),
  created_at: createdAt(),
}, (t) => [index("messages_conversation_idx").on(t.conversation_id, t.created_at)]);

// ---------------------------------------------------------------------------
// Trust: agents, pods, verification, reviews, reports, commission
// ---------------------------------------------------------------------------
export const agent_profiles = mysqlTable("agent_profiles", {
  user_id: ref("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  agent_code: varchar("agent_code", { length: 12 }).notNull().unique(),
  english_name: varchar("english_name", { length: 80 }),
  title: varchar("title", { length: 120 }),
  company_name: varchar("company_name", { length: 120 }),
  license_no: varchar("license_no", { length: 50 }),
  license_verified: boolean("license_verified").notNull().default(false),
  experience_years: smallint("experience_years"),
  specialized_zones: json("specialized_zones").$type<string[]>().notNull().$defaultFn(() => []),
  specialized_categories: json("specialized_categories").$type<string[]>().notNull().$defaultFn(() => []),
  certificates: json("certificates").$type<unknown[]>().notNull().$defaultFn(() => []),
  rating_avg: decimal("rating_avg", { precision: 3, scale: 2, mode: "number" }).notNull().default(0),
  rating_count: int("rating_count").notNull().default(0),
  closed_deals: int("closed_deals").notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const agency_pods = mysqlTable("agency_pods", {
  id: id(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  zone_id: ref("zone_id").references(() => zones.id, { onDelete: "set null" }),
  leader_id: ref("leader_id").notNull().references(() => profiles.id),
  status: mysqlEnum("status", ["pending", "verified", "suspended"]).notNull().default("pending"),
  trust_score: smallint("trust_score").notNull().default(0),
  insurance_coverage: money("insurance_coverage").notNull().default(0),
  verifications: json("verifications").$type<Record<string, boolean>>().notNull().$defaultFn(() => ({})),
  rating_avg: decimal("rating_avg", { precision: 3, scale: 2, mode: "number" }).notNull().default(0),
  rating_count: int("rating_count").notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const pod_members = mysqlTable("pod_members", {
  pod_id: ref("pod_id").notNull().references(() => agency_pods.id, { onDelete: "cascade" }),
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["leader", "member"]).notNull().default("member"),
  joined_at: createdAt("joined_at"),
}, (t) => [primaryKey({ columns: [t.pod_id, t.user_id] }), index("pod_members_user_idx").on(t.user_id)]);

export const verification_requests = mysqlTable("verification_requests", {
  id: id(),
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  kind: mysqlEnum("kind", ["identity", "agent_license", "property_ownership", "company"]).notNull(),
  property_id: ref("property_id").references(() => properties.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["pending", "needs_info", "approved", "rejected"]).notNull().default("pending"),
  submitted_data: json("submitted_data").$type<Record<string, string>>().notNull().$defaultFn(() => ({})),
  reviewer_id: ref("reviewer_id"),
  reviewer_note: text("reviewer_note"),
  submitted_at: isoDatetime("submitted_at").notNull().$defaultFn(nowIso),
  reviewed_at: isoDatetime("reviewed_at"),
}, (t) => [index("verification_queue_idx").on(t.status, t.submitted_at), index("verification_user_idx").on(t.user_id)]);

export const verification_documents = mysqlTable("verification_documents", {
  id: id(),
  request_id: ref("request_id").notNull().references(() => verification_requests.id, { onDelete: "cascade" }),
  doc_type: varchar("doc_type", { length: 30 }).notNull(),
  storage_path: varchar("storage_path", { length: 300 }).notNull(),
  created_at: createdAt(),
}, (t) => [index("verification_docs_request_idx").on(t.request_id)]);

export const reviews = mysqlTable("reviews", {
  id: id(),
  reviewer_id: ref("reviewer_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  target_type: mysqlEnum("target_type", ["agent", "seller", "pod"]).notNull(),
  target_id: ref("target_id").notNull(),
  rating: smallint("rating").notNull(),
  body: text("body"),
  status: mysqlEnum("status", ["published", "hidden"]).notNull().default("published"),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex("reviews_unique").on(t.reviewer_id, t.target_type, t.target_id), index("reviews_target_idx").on(t.target_type, t.target_id)]);

export const reports = mysqlTable("reports", {
  id: id(),
  reporter_id: ref("reporter_id"),
  target_type: mysqlEnum("target_type", ["property", "user", "message", "review"]).notNull(),
  target_id: ref("target_id").notNull(),
  reason: mysqlEnum("reason", ["scam", "fake_listing", "wrong_info", "duplicate", "already_sold", "harassment", "spam", "other"]).notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["open", "investigating", "resolved", "dismissed"]).notNull().default("open"),
  handled_by: ref("handled_by"),
  resolution_note: text("resolution_note"),
  created_at: createdAt(),
  resolved_at: isoDatetime("resolved_at"),
}, (t) => [index("reports_queue_idx").on(t.status, t.created_at), index("reports_target_idx").on(t.target_type, t.target_id)]);

export const commission_programs = mysqlTable("commission_programs", {
  property_id: ref("property_id").primaryKey().references(() => properties.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  sale_rate_pct: decimal("sale_rate_pct", { precision: 5, scale: 2, mode: "number" }),
  rent_month1_rate_pct: decimal("rent_month1_rate_pct", { precision: 6, scale: 2, mode: "number" }),
  rent_month2_rate_pct: decimal("rent_month2_rate_pct", { precision: 6, scale: 2, mode: "number" }),
  rent_month3_plus_rate_pct: decimal("rent_month3_plus_rate_pct", { precision: 6, scale: 2, mode: "number" }),
  renewal_rate_pct: decimal("renewal_rate_pct", { precision: 6, scale: 2, mode: "number" }),
  terms: text("terms"),
  starts_on: date("starts_on", { mode: "string" }),
  ends_on: date("ends_on", { mode: "string" }),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const commission_access_requests = mysqlTable("commission_access_requests", {
  id: id(),
  agent_id: ref("agent_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  property_id: ref("property_id").references(() => properties.id, { onDelete: "cascade" }), // null = platform partner
  status: mysqlEnum("status", ["pending", "approved", "rejected", "revoked"]).notNull().default("pending"),
  message: text("message"),
  reviewed_by: ref("reviewed_by"),
  reviewed_at: isoDatetime("reviewed_at"),
  created_at: createdAt(),
}, (t) => [index("commission_access_agent_idx").on(t.agent_id, t.status), index("commission_access_property_idx").on(t.property_id)]);

// ---------------------------------------------------------------------------
// Content & billing
// ---------------------------------------------------------------------------
export const hubs = mysqlTable("hubs", {
  id: id(),
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  theme: varchar("theme", { length: 120 }),
  description: text("description"),
  zone_id: ref("zone_id").references(() => zones.id, { onDelete: "set null" }),
  banner_url: text("banner_url"),
  status: mysqlEnum("status", ["draft", "scheduled", "live", "ended"]).notNull().default("draft"),
  starts_at: isoDatetime("starts_at").notNull(),
  ends_at: isoDatetime("ends_at").notNull(),
  created_by: ref("created_by"),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const hub_properties = mysqlTable("hub_properties", {
  hub_id: ref("hub_id").notNull().references(() => hubs.id, { onDelete: "cascade" }),
  property_id: ref("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  added_at: createdAt("added_at"),
}, (t) => [primaryKey({ columns: [t.hub_id, t.property_id] })]);

export const activities = mysqlTable("activities", {
  id: id(),
  hub_id: ref("hub_id").references(() => hubs.id, { onDelete: "set null" }),
  property_id: ref("property_id").references(() => properties.id, { onDelete: "set null" }),
  host_id: ref("host_id"),
  type: mysqlEnum("type", ["live_tour", "open_house", "live_qa", "workshop", "consultation"]).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  starts_at: isoDatetime("starts_at").notNull(),
  duration_min: smallint("duration_min").notNull().default(60),
  seats: int("seats"),
  location: varchar("location", { length: 200 }),
  meeting_url: varchar("meeting_url", { length: 500 }),
  status: mysqlEnum("status", ["draft", "published", "cancelled", "completed"]).notNull().default("draft"),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [index("activities_upcoming_idx").on(t.status, t.starts_at)]);

export const activity_registrations = mysqlTable("activity_registrations", {
  activity_id: ref("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  created_at: createdAt(),
}, (t) => [primaryKey({ columns: [t.activity_id, t.user_id] })]);

export const plans = mysqlTable("plans", {
  id: varchar("id", { length: 40 }).primaryKey(),
  audience: mysqlEnum("audience", ["owner", "agent", "investor"]).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  badge: varchar("badge", { length: 60 }),
  description: text("description"),
  price_thb: money("price_thb", 10).notNull(),
  period: mysqlEnum("period", ["month", "year", "lifetime"]).notNull(),
  features: json("features").$type<string[]>().notNull().$defaultFn(() => []),
  quotas: json("quotas").$type<Record<string, unknown>>().notNull().$defaultFn(() => ({})),
  active: boolean("active").notNull().default(true),
  sort_order: int("sort_order").notNull().default(0),
});

export const subscriptions = mysqlTable("subscriptions", {
  id: id(),
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  plan_id: varchar("plan_id", { length: 40 }).notNull().references(() => plans.id),
  status: mysqlEnum("status", ["active", "past_due", "cancelled", "expired"]).notNull().default("active"),
  current_period_start: isoDatetime("current_period_start").notNull().$defaultFn(nowIso),
  current_period_end: isoDatetime("current_period_end"),
  cancel_at_period_end: boolean("cancel_at_period_end").notNull().default(false),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [index("subscriptions_user_idx").on(t.user_id, t.status)]);

export const boost_products = mysqlTable("boost_products", {
  id: varchar("id", { length: 40 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  price_thb: money("price_thb", 10).notNull(),
  duration_days: int("duration_days").notNull(),
  placement: varchar("placement", { length: 30 }).notNull().default("featured"),
  active: boolean("active").notNull().default(true),
  sort_order: int("sort_order").notNull().default(0),
});

export const orders = mysqlTable("orders", {
  id: id(),
  user_id: ref("user_id").notNull().references(() => profiles.id),
  kind: mysqlEnum("kind", ["subscription", "boost"]).notNull(),
  plan_id: varchar("plan_id", { length: 40 }).references(() => plans.id),
  boost_product_id: varchar("boost_product_id", { length: 40 }).references(() => boost_products.id),
  property_id: ref("property_id").references(() => properties.id, { onDelete: "set null" }),
  amount_thb: money("amount_thb", 12).notNull(),
  vat_thb: money("vat_thb", 12).notNull().default(0),
  status: mysqlEnum("status", ["pending", "paid", "failed", "refunded", "cancelled"]).notNull().default("pending"),
  provider: varchar("provider", { length: 30 }),
  provider_ref: varchar("provider_ref", { length: 120 }),
  paid_at: isoDatetime("paid_at"),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [index("orders_user_idx").on(t.user_id, t.created_at), uniqueIndex("orders_provider_ref_idx").on(t.provider, t.provider_ref)]);

export const boosts = mysqlTable("boosts", {
  id: id(),
  property_id: ref("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  product_id: varchar("product_id", { length: 40 }).notNull().references(() => boost_products.id),
  order_id: ref("order_id").references(() => orders.id),
  placement: varchar("placement", { length: 30 }).notNull(),
  starts_at: isoDatetime("starts_at").notNull(),
  ends_at: isoDatetime("ends_at").notNull(),
  created_at: createdAt(),
}, (t) => [index("boosts_active_idx").on(t.placement, t.ends_at)]);

export const invoices = mysqlTable("invoices", {
  id: id(),
  order_id: ref("order_id").notNull().unique().references(() => orders.id),
  invoice_no: varchar("invoice_no", { length: 20 }).notNull().unique(),
  bill_to_name: varchar("bill_to_name", { length: 200 }).notNull(),
  bill_to_tax_id: varchar("bill_to_tax_id", { length: 20 }),
  bill_to_address: text("bill_to_address"),
  subtotal_thb: money("subtotal_thb", 12).notNull(),
  vat_thb: money("vat_thb", 12).notNull(),
  total_thb: money("total_thb", 12).notNull(),
  pdf_path: varchar("pdf_path", { length: 300 }),
  issued_at: createdAt("issued_at"),
});

// ---------------------------------------------------------------------------
// Compliance (PDPA)
// ---------------------------------------------------------------------------
export const consents = mysqlTable("consents", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  kind: mysqlEnum("kind", ["terms", "privacy", "marketing"]).notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  granted: boolean("granted").notNull(),
  user_agent: varchar("user_agent", { length: 300 }),
  created_at: createdAt(),
}, (t) => [index("consents_user_idx").on(t.user_id, t.kind, t.created_at)]);

export const account_deletion_requests = mysqlTable("account_deletion_requests", {
  id: id(),
  user_id: ref("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "cancelled"]).notNull().default("pending"),
  processed_by: ref("processed_by"),
  requested_at: createdAt("requested_at"),
  processed_at: isoDatetime("processed_at"),
}, (t) => [index("deletion_user_idx").on(t.user_id, t.status)]);
