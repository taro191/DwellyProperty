/**
 * Sample activity for every seeded user, created through the real services so it obeys the same
 * rules, notifications and audit trail as the app: favourites, inquiries, viewings, offers, chats,
 * paid orders, plus items waiting in each staff queue (listing review, documents, reports, partner requests).
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import * as t from "@/server/db/schema";
import type { Actor } from "@/server/services/core";
import * as billing from "@/server/services/billing";
import * as chat from "@/server/services/chat";
import * as content from "@/server/services/content";
import * as deals from "@/server/services/deals";
import * as listings from "@/server/services/listings";
import * as trust from "@/server/services/trust";

const DAY = 86_400_000;
/** `days` from now at `hour` o'clock Bangkok time. */
const at = (days: number, hour: number) => {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(hour - 7, 0, 0, 0);
  return d.toISOString();
};

async function actorOf(id: string): Promise<Actor> {
  const [p] = await db.select().from(t.profiles).where(eq(t.profiles.id, id));
  const roles = await db.select().from(t.user_roles).where(eq(t.user_roles.user_id, id));
  const [s] = await db.select().from(t.staff_members).where(eq(t.staff_members.user_id, id));
  return { id, status: p.status, roles: roles.map((r) => r.role), staffRole: s?.active ? s.role : null };
}

type Prop = typeof t.properties.$inferSelect;

export async function seedActivity(U: Record<string, string>) {
  const A: Record<string, Actor> = {};
  for (const [k, id] of Object.entries(U)) A[k] = await actorOf(id);
  const props = await db.select().from(t.properties).where(eq(t.properties.status, "active"));
  const pick = (f: (p: Prop) => boolean, i = 0) => props.filter(f)[i] ?? props.filter(f)[0] ?? props[i] ?? props[0];
  const seller = (p: Prop) => A[Object.keys(U).find((k) => U[k] === (p.agent_id ?? p.owner_id))!];
  const latest = async <T extends { created_at: string }>(rows: T[]) => rows.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const ownerSale = pick((p) => p.owner_id === U.owner && !p.agent_id && p.sale_price != null && p.category !== "land");
  const ownerSale2 = pick((p) => p.owner_id === U.owner && !p.agent_id && p.sale_price != null && p.id !== ownerSale.id);
  const rental = pick((p) => p.rent_price != null && p.owner_id === U.owner2) ?? pick((p) => p.rent_price != null);
  const rental2 = pick((p) => p.rent_price != null && p.id !== rental.id);
  const agentSale = pick((p) => p.agent_id === U.agent && p.sale_price != null);
  const land = pick((p) => p.category === "land" && p.sale_price != null);

  // --- Buyer: saved homes, an inquiry, a confirmed viewing, a countered offer, a chat, an activity sign-up, a report
  for (const p of [ownerSale, agentSale, land]) await listings.setFavorite(A.buyer, p.id, true);
  for (const p of [ownerSale, ownerSale2, agentSale]) await listings.trackView(p.id, U.buyer);
  await deals.createInquiry(A.buyer, { property_id: ownerSale.id, intent: "buy", message: "สนใจซื้อค่ะ ห้องยังว่างไหม ต่อราคาได้หรือเปล่า", contact_phone: "081-234-5678", budget: Math.round(Number(ownerSale.sale_price) * 0.95) });
  await deals.createAppointment(A.buyer, { property_id: ownerSale.id, format: "onsite", scheduled_at: at(2, 14), buyer_note: "ขอดูห้องจริงช่วงบ่ายครับ" });
  const [buyerAppt] = await db.select().from(t.appointments).where(eq(t.appointments.buyer_id, U.buyer));
  await deals.updateAppointment(seller(ownerSale), buyerAppt.id, { status: "confirmed", seller_note: "เจอกันที่ล็อบบี้ชั้น 1 ครับ" });
  await deals.createOffer(A.buyer, { property_id: ownerSale.id, kind: "purchase", offer_price: Math.round(Number(ownerSale.sale_price) * 0.92), valid_days: 7, buyer_note: "พร้อมโอนภายใน 30 วัน" });
  const [buyerOffer] = await db.select().from(t.offers).where(eq(t.offers.buyer_id, U.buyer));
  await deals.respondOffer(seller(ownerSale), buyerOffer.id, { status: "countered", counter_price: Math.round(Number(ownerSale.sale_price) * 0.97), seller_note: "ลดให้ได้ 3% ครับ" });
  const c1 = await chat.startConversation(A.buyer, ownerSale.id);
  await chat.sendMessage(A.buyer, c1, "สวัสดีครับ สนใจห้องนี้ ค่าส่วนกลางเท่าไหร่ครับ");
  await chat.sendMessage(seller(ownerSale), c1, "สวัสดีค่ะ ค่าส่วนกลางตามประกาศเลยค่ะ นัดดูห้องได้ทุกวันนะคะ");
  await chat.sendMessage(A.buyer, c1, "ขอบคุณครับ เดี๋ยวนัดผ่านระบบนะครับ");
  const [act] = await db.select().from(t.activities).limit(1);
  if (act) await content.setRegistration(A.buyer, act.id, true);
  await trust.createReport(A.buyer, { target_type: "property", target_id: ownerSale2.id, reason: "wrong_info", details: "ขนาดห้องในประกาศไม่ตรงกับรูป (ข้อมูลทดสอบ)" });

  // --- Tenant: rentals saved, rent inquiry, pending video viewing, rent offer, chat, identity check waiting for a verifier
  for (const p of [rental, rental2]) await listings.setFavorite(A.tenant, p.id, true);
  await deals.createInquiry(A.tenant, { property_id: rental.id, intent: "rent", message: "สนใจเช่า 1 ปี เข้าอยู่ได้ต้นเดือนหน้าไหมคะ", contact_phone: "086-111-2233" });
  await deals.createAppointment(A.tenant, { property_id: rental.id, format: "video", scheduled_at: at(1, 19), buyer_note: "ขอวิดีโอคอลช่วงเย็นค่ะ" });
  await deals.createOffer(A.tenant, { property_id: rental.id, kind: "rent", offer_price: Math.round(Number(rental.rent_price) * 0.95), valid_days: 5, buyer_note: "ทำสัญญา 1 ปี" });
  const c2 = await chat.startConversation(A.tenant, rental.id);
  await chat.sendMessage(A.tenant, c2, "เลี้ยงแมวได้ไหมคะ");
  await chat.sendMessage(seller(rental), c2, "ได้ครับ 1 ตัว มีค่ามัดจำเพิ่มนิดหน่อย");
  await trust.createVerificationRequest(A.tenant, { kind: "identity", data: { full_name: "กมลชนก ทดสอบ", id_last4: "1234", note: "ข้อมูลทดสอบ" } });

  // --- Investor: land + agent listing saved, invest inquiry (seller follows up), offer, viewing, paid club plan, chat with agent
  for (const p of [land, agentSale]) await listings.setFavorite(A.investor, p.id, true);
  await deals.createInquiry(A.investor, { property_id: land.id, intent: "invest", message: "สนใจที่ดินแปลงนี้เพื่อทำบ้านเช่า ขอเอกสารโฉนดเพิ่มเติมครับ", budget: Math.round(Number(land.sale_price) * 0.9) });
  const invInq = await latest(await db.select().from(t.inquiries).where(eq(t.inquiries.buyer_id, U.investor)));
  await deals.updateInquiry(seller(land), invInq.id, { status: "contacted", seller_notes: "ส่งสำเนาโฉนดทาง LINE แล้ว" });
  await deals.createOffer(A.investor, { property_id: land.id, kind: "purchase", offer_price: Math.round(Number(land.sale_price) * 0.88), valid_days: 10, buyer_note: "ซื้อเงินสด" });
  await deals.createAppointment(A.investor, { property_id: agentSale.id, format: "onsite", scheduled_at: at(4, 10) });
  const subInv = await billing.createOrder(A.investor, { kind: "subscription", plan_id: "inv-club" });
  await billing.fulfillOrder(subInv, "test", "SEED-INV-CLUB");
  const c3 = await chat.startConversation(A.investor, agentSale.id);
  await chat.sendMessage(A.investor, c3, "ผลตอบแทนค่าเช่าโดยประมาณกี่เปอร์เซ็นต์ครับ");
  await chat.sendMessage(A.agent, c3, "ประมาณ 5–6% ต่อปีครับ เดี๋ยวส่งตัวเลขเทียบให้นะครับ");

  // --- Owner: paid plan + boost, lead follow-up, a listing waiting for moderator review, ownership docs waiting for a verifier
  const subOwner = await billing.createOrder(A.owner, { kind: "subscription", plan_id: "owner-pro" });
  await billing.fulfillOrder(subOwner, "test", "SEED-OWNER-PRO");
  const boost = await billing.createOrder(A.owner, { kind: "boost", boost_product_id: "boost-7d", property_id: ownerSale.id });
  await billing.fulfillOrder(boost, "test", "SEED-BOOST");
  const buyerInq = await latest(await db.select().from(t.inquiries).where(and(eq(t.inquiries.buyer_id, U.buyer), eq(t.inquiries.property_id, ownerSale.id))));
  if (seller(ownerSale).id === U.owner) await deals.updateInquiry(A.owner, buyerInq.id, { status: "qualified", seller_notes: "ผู้ซื้อมีเงินพร้อม นัดดูห้องแล้ว" });
  const {
    id: _id, code: _code, owner_id: _o, status: _s, is_verified: _v, verified_at: _va, featured_until: _f, views_count: _vc,
    saves_count: _sc, inquiries_count: _ic, published_at: _p, expires_at: _e, created_at: _c, updated_at: _u, rejection_reason: _r, ...base
  } = ownerSale;
  void [_id, _code, _o, _s, _v, _va, _f, _vc, _sc, _ic, _p, _e, _c, _u, _r];
  const draft = await listings.createListing(A.owner, { ...base, agent_id: null, pod_id: null, title: `${ownerSale.title} (ห้องใหม่ รอตรวจ)`, description: "ประกาศตัวอย่างที่รอทีมงานตรวจสอบ" });
  const [cover] = await db.select().from(t.property_media).where(eq(t.property_media.property_id, ownerSale.id)).limit(1);
  await db.insert(t.property_media).values({ property_id: draft.id, kind: "image", external_url: cover?.external_url ?? null, storage_path: cover?.storage_path ?? null, sort_order: 0 });
  await listings.changeListingStatus(A.owner, draft.id, "pending_review");
  await trust.createVerificationRequest(A.owner, { kind: "property_ownership", property_id: ownerSale2.id, data: { deed_no: "12345 (ทดสอบ)", note: "ขอป้ายยืนยันกรรมสิทธิ์" } });

  // --- Owner 2 & agent: plans and follow-ups; agent asks for Co-Agent partner access (moderator queue)
  const subAgent = await billing.createOrder(A.agent, { kind: "subscription", plan_id: "agent-starter" });
  await billing.fulfillOrder(subAgent, "test", "SEED-AGENT");
  await billing.createOrder(A.owner2, { kind: "subscription", plan_id: "owner-pro" }); // left unpaid for the finance view
  await trust.requestPartnerAccess(A.agent, "ขอเข้าร่วมโปรแกรม Co-Agent ในโซนศาลายา");
  await trust.createReport(A.tenant, { target_type: "user", target_id: U.owner2, reason: "spam", details: "ส่งข้อความซ้ำหลายครั้ง (ข้อมูลทดสอบ)" });
}
