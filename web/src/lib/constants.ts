import type {
  AppRole, AppointmentStatus, Furnishing, InquiryIntent, InquiryStatus, ListingType, OfferStatus,
  PropertyCategory, PropertyStatus, ReportReason, ReportStatus, StaffRole, VerificationKind, VerificationStatus,
} from "@/lib/types";

export const CATEGORY_LABEL: Record<PropertyCategory, string> = {
  condo: "คอนโดมิเนียม",
  house: "บ้านเดี่ยว",
  townhome: "ทาวน์โฮม",
  land: "ที่ดิน",
  apartment: "อพาร์ตเมนต์",
  commercial: "อาคารพาณิชย์",
};

export const LISTING_TYPE_LABEL: Record<ListingType, string> = {
  sale: "ขาย",
  rent: "ให้เช่า",
  sale_or_rent: "ขาย / ให้เช่า",
};

export const STATUS_LABEL: Record<PropertyStatus, string> = {
  draft: "แบบร่าง",
  pending_review: "รอตรวจสอบ",
  active: "เผยแพร่",
  reserved: "ติดจอง",
  sold: "ขายแล้ว",
  rented: "ให้เช่าแล้ว",
  expired: "หมดอายุ",
  rejected: "ไม่ผ่าน / ถูกระงับ",
  archived: "ปิดประกาศ",
};

export const STATUS_TONE: Record<PropertyStatus, "neutral" | "accent" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  pending_review: "warning",
  active: "accent",
  reserved: "info",
  sold: "info",
  rented: "info",
  expired: "neutral",
  rejected: "danger",
  archived: "neutral",
};

export const FURNISHING_LABEL: Record<Furnishing, string> = {
  unfurnished: "ไม่มีเฟอร์นิเจอร์",
  partial: "เฟอร์นิเจอร์บางส่วน",
  full: "เฟอร์นิเจอร์ครบ",
};

export const DIRECTION_LABEL: Record<string, string> = {
  N: "ทิศเหนือ", NE: "ทิศตะวันออกเฉียงเหนือ", E: "ทิศตะวันออก", SE: "ทิศตะวันออกเฉียงใต้",
  S: "ทิศใต้", SW: "ทิศตะวันตกเฉียงใต้", W: "ทิศตะวันตก", NW: "ทิศตะวันตกเฉียงเหนือ",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  buyer: "ผู้ซื้อ",
  tenant: "ผู้เช่า",
  owner: "เจ้าของ / ผู้ให้เช่า",
  investor: "นักลงทุน",
  agent: "นายหน้า",
};

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  moderator: "Moderator",
  verifier: "Verifier",
  support: "Support",
  finance: "Finance",
};

export const INTENT_LABEL: Record<InquiryIntent, string> = {
  buy: "ต้องการซื้อ",
  rent: "ต้องการเช่า",
  invest: "ลงทุน",
  info: "สอบถามข้อมูล",
};

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "ใหม่",
  contacted: "ติดต่อแล้ว",
  qualified: "มีโอกาสปิด",
  won: "ปิดการขายได้",
  lost: "ไม่สำเร็จ",
};

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  declined: "ปฏิเสธ",
  cancelled: "ยกเลิก",
  completed: "เสร็จสิ้น",
  no_show: "ไม่มาตามนัด",
};

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  pending: "รอตอบรับ",
  countered: "ผู้ขายเสนอราคาใหม่",
  accepted: "ตอบรับแล้ว",
  rejected: "ปฏิเสธ",
  withdrawn: "ถอนข้อเสนอ",
  expired: "หมดอายุ",
};

export const VERIFICATION_KIND_LABEL: Record<VerificationKind, string> = {
  identity: "ยืนยันตัวตน (KYC)",
  agent_license: "ใบอนุญาตนายหน้า",
  property_ownership: "กรรมสิทธิ์ทรัพย์ (โฉนด)",
  company: "เอกสารบริษัท",
};

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  pending: "รอตรวจสอบ",
  needs_info: "ขอข้อมูลเพิ่ม",
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
};

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  scam: "หลอกลวง / มิจฉาชีพ",
  fake_listing: "ประกาศปลอม",
  wrong_info: "ข้อมูลไม่ถูกต้อง",
  duplicate: "ประกาศซ้ำ",
  already_sold: "ขาย/เช่าไปแล้ว",
  harassment: "คุกคาม / ไม่สุภาพ",
  spam: "สแปม",
  other: "อื่นๆ",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: "เปิด",
  investigating: "กำลังตรวจสอบ",
  resolved: "ดำเนินการแล้ว",
  dismissed: "ไม่ดำเนินการ",
};

export const PROVINCES = [
  "กรุงเทพมหานคร", "นครปฐม", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "ชลบุรี", "เชียงใหม่", "ภูเก็ต",
  "ขอนแก่น", "ระยอง", "ประจวบคีรีขันธ์", "สงขลา", "นครราชสีมา", "อยุธยา", "เชียงราย", "สุราษฎร์ธานี",
] as const;

export const AMENITIES = [
  "สระว่ายน้ำ", "ฟิตเนส", "ที่จอดรถ", "รปภ. 24 ชม.", "คีย์การ์ด", "ลิฟต์", "สวน", "ใกล้รถไฟฟ้า",
  "ใกล้มหาวิทยาลัย", "อินเทอร์เน็ต", "เครื่องซักผ้า", "แอร์",
] as const;

export const CONSENT_VERSION = "2026-10-01";
