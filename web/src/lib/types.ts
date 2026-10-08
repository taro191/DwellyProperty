// Row types used by pages/components. They mirror src/server/db/schema.ts (snake_case
// app tables); keep both in sync when the schema changes.

export type AppRole = "buyer" | "tenant" | "owner" | "investor" | "agent";
export type StaffRole = "super_admin" | "moderator" | "verifier" | "support" | "finance";
export type AccountStatus = "active" | "suspended" | "banned" | "deleted";
export type ListingType = "sale" | "rent" | "sale_or_rent";
export type PropertyCategory = "condo" | "house" | "townhome" | "land" | "apartment" | "commercial";
export type PropertyStatus =
  | "draft" | "pending_review" | "active" | "reserved" | "sold" | "rented" | "expired" | "rejected" | "archived";
export type Furnishing = "unfurnished" | "partial" | "full";
export type InquiryIntent = "buy" | "rent" | "invest" | "info";
export type InquiryStatus = "new" | "contacted" | "qualified" | "won" | "lost";
export type AppointmentFormat = "onsite" | "video" | "phone";
export type AppointmentStatus = "pending" | "confirmed" | "declined" | "cancelled" | "completed" | "no_show";
export type OfferKind = "purchase" | "rent";
export type OfferStatus = "pending" | "countered" | "accepted" | "rejected" | "withdrawn" | "expired";
export type VerificationKind = "identity" | "agent_license" | "property_ownership" | "company";
export type VerificationStatus = "pending" | "needs_info" | "approved" | "rejected";
export type ReportTarget = "property" | "user" | "message" | "review";
export type ReportReason =
  | "scam" | "fake_listing" | "wrong_info" | "duplicate" | "already_sold" | "harassment" | "spam" | "other";
export type ReportStatus = "open" | "investigating" | "resolved" | "dismissed";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  primary_role: AppRole;
  status: AccountStatus;
  status_reason: string | null;
  is_kyc_verified: boolean;
  locale: "th" | "en";
  login_disabled: boolean;
  login_disabled_reason: string | null;
  onboarded_at: string | null;
  created_at: string;
}

export interface ProfilePrivate {
  user_id: string;
  email: string | null;
  phone: string | null;
  phone_verified: boolean;
  line_id: string | null;
}

export interface Zone {
  id: string;
  slug: string;
  name_th: string;
  name_en: string | null;
  icon: string | null;
  description: string | null;
  active: boolean;
}

export interface LandDetails {
  rai?: number;
  ngan?: number;
  sq_wa?: number;
  deed_type?: string;
  zoning?: string;
  road_frontage_m?: number;
  road_type?: string;
  shape?: string;
  utilities?: string[];
  suitable_for?: string[];
  price_per_sqwa?: number;
}

export interface Property {
  id: string;
  code: string;
  owner_id: string;
  agent_id: string | null;
  pod_id: string | null;
  zone_id: string | null;
  listing_type: ListingType;
  category: PropertyCategory;
  status: PropertyStatus;
  rejection_reason: string | null;
  title: string;
  description: string | null;
  project_name: string | null;
  sale_price: number | null;
  rent_price: number | null;
  price_negotiable: boolean;
  usable_area_sqm: number | null;
  land_area_sqwa: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  total_floors: number | null;
  direction: string | null;
  furnishing: Furnishing | null;
  maintenance_fee: number | null;
  year_built: number | null;
  available_from: string | null;
  deposit_months: number | null;
  advance_months: number | null;
  min_lease_months: number | null;
  pets_allowed: boolean | null;
  land_details: LandDetails;
  tags: string[];
  amenities: string[];
  province: string;
  district: string | null;
  subdistrict: string | null;
  postal_code: string | null;
  address_line: string | null;
  lat: number | null;
  lng: number | null;
  show_exact_location: boolean;
  is_verified: boolean;
  verified_at: string | null;
  featured_until: string | null;
  views_count: number;
  saves_count: number;
  inquiries_count: number;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyMedia {
  id: string;
  property_id: string;
  kind: "image" | "video" | "floorplan";
  storage_path: string | null;
  external_url: string | null;
  caption: string | null;
  sort_order: number;
}

/** Listing card shape: property + its media. */
export type PropertyWithMedia = Property & { property_media: PropertyMedia[] };

export interface Inquiry {
  id: string;
  property_id: string;
  buyer_id: string;
  seller_id: string;
  intent: InquiryIntent;
  status: InquiryStatus;
  message: string | null;
  contact_phone: string | null;
  budget: number | null;
  seller_notes: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  property_id: string;
  buyer_id: string;
  seller_id: string;
  format: AppointmentFormat;
  scheduled_at: string;
  duration_min: number;
  status: AppointmentStatus;
  buyer_note: string | null;
  seller_note: string | null;
  meeting_url: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  property_id: string;
  buyer_id: string;
  seller_id: string;
  kind: OfferKind;
  listed_price: number;
  offer_price: number;
  counter_price: number | null;
  buyer_note: string | null;
  seller_note: string | null;
  valid_until: string;
  status: OfferStatus;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  property_id: string | null;
  property_title: string | null;
  property_code: string | null;
  other_user_id: string | null;
  other_name: string | null;
  other_avatar: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment_path: string | null;
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  kind: VerificationKind;
  property_id: string | null;
  status: VerificationStatus;
  submitted_data: Record<string, string>;
  reviewer_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  target_type: ReportTarget;
  target_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolution_note: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  audience: "owner" | "agent" | "investor";
  name: string;
  badge: string | null;
  description: string | null;
  price_thb: number;
  period: "month" | "year" | "lifetime";
  features: string[];
}

/** Standard result for server actions consumed by forms. */
export type ActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export interface BuyerRequest {
  id: string;
  user_id: string;
  deal: "buy" | "rent";
  category: PropertyCategory;
  province: string;
  area: string;
  max_budget: number;
  min_size: number | null;
  criteria: string | null;
  status: "active" | "closed";
  created_at: string;
  updated_at: string;
}
