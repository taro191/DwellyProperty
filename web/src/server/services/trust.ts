import "server-only";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  agency_pods, agent_profiles, commission_access_requests as car, commission_programs, pod_members, profiles, properties,
  reports, user_roles, verification_documents, verification_requests, zones,
} from "@/server/db/schema";
import { AppError, audit, forbidden, isStaff, nextCounter, notFound, notify, requireActive, type Actor, type Tx } from "./core";
import type { ReportReason, ReportTarget, VerificationKind } from "@/lib/types";

// ---------------------------------------------------------------------------
// Agent profile & pods
// ---------------------------------------------------------------------------
export async function getAgentProfile(userId: string) {
  const [a] = await db.select().from(agent_profiles).where(eq(agent_profiles.user_id, userId)).limit(1);
  return a ?? null;
}

export async function saveAgentProfile(actor: Actor, v: {
  english_name?: string; title?: string; company_name?: string; license_no?: string; experience_years?: number; specialized_categories: string[];
}) {
  requireActive(actor);
  await db.transaction(async (tx) => {
    await tx.insert(user_roles).ignore().values({ user_id: actor.id, role: "agent" });
    const [existing] = await tx.select().from(agent_profiles).where(eq(agent_profiles.user_id, actor.id)).limit(1).for("update");
    const fields = {
      english_name: v.english_name ?? null, title: v.title ?? null, company_name: v.company_name ?? null,
      license_no: v.license_no ?? null, experience_years: v.experience_years ?? null, specialized_categories: v.specialized_categories,
    };
    if (existing) {
      // Changing the licence number drops verification until it is re-checked.
      const licenseChanged = (existing.license_no ?? null) !== fields.license_no;
      await tx.update(agent_profiles).set({ ...fields, ...(licenseChanged ? { license_verified: false } : {}) })
        .where(eq(agent_profiles.user_id, actor.id));
    } else {
      const n = await nextCounter(tx, "agent_code", 1001);
      await tx.insert(agent_profiles).values({ ...fields, user_id: actor.id, agent_code: `AG${n}` });
    }
  });
}

export async function myPods(actor: Actor) {
  return db.select({ role: pod_members.role, pod: agency_pods }).from(pod_members)
    .innerJoin(agency_pods, eq(agency_pods.id, pod_members.pod_id)).where(eq(pod_members.user_id, actor.id));
}

export async function createPod(actor: Actor, v: { name: string; description?: string; zone_id?: string }) {
  requireActive(actor);
  if (!actor.roles.includes("agent")) throw forbidden("เฉพาะบัญชีนายหน้าเท่านั้น");
  await db.transaction(async (tx) => {
    const n = await nextCounter(tx, "pod_code", 101);
    const id = crypto.randomUUID();
    await tx.insert(agency_pods).values({ id, code: `POD-${n}`, name: v.name, description: v.description ?? null, zone_id: v.zone_id ?? null, leader_id: actor.id });
    await tx.insert(pod_members).values({ pod_id: id, user_id: actor.id, role: "leader" });
  });
}

// ---------------------------------------------------------------------------
// Verification (KYC / licence / ownership / company)
// ---------------------------------------------------------------------------
export async function createVerificationRequest(actor: Actor, v: { kind: VerificationKind; property_id?: string; data: Record<string, string> }) {
  requireActive(actor);
  if (v.kind === "identity" && actor.status === "active") {
    const [p] = await db.select({ k: profiles.is_kyc_verified }).from(profiles).where(eq(profiles.id, actor.id)).limit(1);
    if (p?.k) throw new AppError("บัญชีของคุณยืนยันตัวตนแล้ว");
  }
  if (v.kind === "property_ownership") {
    if (!v.property_id) throw new AppError("เลือกประกาศที่ต้องการยืนยัน");
    const [p] = await db.select({ owner: properties.owner_id }).from(properties).where(eq(properties.id, v.property_id)).limit(1);
    if (p?.owner !== actor.id) throw forbidden("ยืนยันได้เฉพาะประกาศของคุณ");
  }
  const propertyId = v.kind === "property_ownership" ? v.property_id! : null;
  const [open] = await db.select({ id: verification_requests.id }).from(verification_requests).where(and(
    eq(verification_requests.user_id, actor.id), eq(verification_requests.kind, v.kind),
    propertyId ? eq(verification_requests.property_id, propertyId) : isNull(verification_requests.property_id),
    inArray(verification_requests.status, ["pending", "needs_info"]),
  )).limit(1);
  if (open) throw new AppError("คุณมีคำขอประเภทนี้ที่รอตรวจสอบอยู่แล้ว");
  const id = crypto.randomUUID();
  await db.insert(verification_requests).values({ id, user_id: actor.id, kind: v.kind, property_id: propertyId, submitted_data: v.data });
  return id;
}

export async function attachVerificationDoc(actor: Actor, requestId: string, docType: string, path: string) {
  requireActive(actor);
  if (!path.startsWith(`${actor.id}/${requestId}/`)) throw forbidden();
  const [r] = await db.select().from(verification_requests).where(eq(verification_requests.id, requestId)).limit(1);
  if (!r || r.user_id !== actor.id || !["pending", "needs_info"].includes(r.status)) throw forbidden();
  await db.insert(verification_documents).values({ request_id: requestId, doc_type: docType.slice(0, 30), storage_path: path });
}

export async function resubmitVerification(actor: Actor, id: string, note: string) {
  requireActive(actor);
  const [r] = await db.select().from(verification_requests).where(eq(verification_requests.id, id)).limit(1);
  if (!r || r.user_id !== actor.id) throw notFound();
  if (r.status !== "needs_info") throw new AppError("คำขออยู่ระหว่างตรวจสอบ ยังแก้ไขไม่ได้");
  await db.update(verification_requests).set({
    status: "pending", submitted_at: new Date().toISOString(), submitted_data: { ...r.submitted_data, applicant_note: note.slice(0, 1000) },
  }).where(eq(verification_requests.id, id));
}

export async function myVerificationRequests(actor: Actor) {
  const rows = await db.select({ r: verification_requests, property_title: properties.title }).from(verification_requests)
    .leftJoin(properties, eq(properties.id, verification_requests.property_id))
    .where(eq(verification_requests.user_id, actor.id)).orderBy(desc(verification_requests.submitted_at));
  const docs = rows.length
    ? await db.select({ request_id: verification_documents.request_id, n: sql<number>`count(*)` }).from(verification_documents)
        .where(inArray(verification_documents.request_id, rows.map((r) => r.r.id))).groupBy(verification_documents.request_id)
    : [];
  return rows.map((r) => ({ ...r.r, property_title: r.property_title, doc_count: Number(docs.find((d) => d.request_id === r.r.id)?.n ?? 0) }));
}

/** May this actor read a private verification file? Owner or verifier staff. */
export async function canReadVerificationFile(actor: Actor, path: string) {
  if (path.startsWith(`${actor.id}/`)) return true;
  return isStaff(actor, ["verifier"]);
}

export async function staffVerificationQueue(actor: Actor, status: "pending" | "needs_info" | "approved" | "rejected") {
  if (!isStaff(actor, ["verifier"])) throw forbidden();
  const rows = await db.select({ r: verification_requests, applicant_name: profiles.display_name, applicant_kyc: profiles.is_kyc_verified, property_title: properties.title, property_code: properties.code })
    .from(verification_requests).innerJoin(profiles, eq(profiles.id, verification_requests.user_id))
    .leftJoin(properties, eq(properties.id, verification_requests.property_id))
    .where(eq(verification_requests.status, status))
    .orderBy(status === "pending" ? verification_requests.submitted_at : desc(verification_requests.submitted_at)).limit(50);
  const docs = rows.length
    ? await db.select().from(verification_documents).where(inArray(verification_documents.request_id, rows.map((r) => r.r.id)))
    : [];
  return rows.map((r) => ({
    ...r.r, applicant: { display_name: r.applicant_name, is_kyc_verified: r.applicant_kyc },
    property: r.property_title ? { title: r.property_title, code: r.property_code! } : null,
    documents: docs.filter((d) => d.request_id === r.r.id),
  }));
}

export async function reviewVerification(actor: Actor, id: string, decision: "approved" | "rejected" | "needs_info", note?: string | null) {
  if (!isStaff(actor, ["verifier"])) throw forbidden();
  if (decision !== "approved" && !note?.trim()) throw new AppError("กรุณาระบุเหตุผล/สิ่งที่ต้องการเพิ่ม");
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(verification_requests).where(eq(verification_requests.id, id)).limit(1).for("update");
    if (!r) throw notFound();
    if (!["pending", "needs_info"].includes(r.status)) throw new AppError("คำขอนี้ตัดสินแล้ว");
    const now = new Date().toISOString();
    await tx.update(verification_requests).set({ status: decision, reviewer_id: actor.id, reviewer_note: note ?? null, reviewed_at: now })
      .where(eq(verification_requests.id, id));
    if (decision === "approved") {
      if (r.kind === "identity") await tx.update(profiles).set({ is_kyc_verified: true, kyc_verified_at: now }).where(eq(profiles.id, r.user_id));
      if (r.kind === "agent_license") {
        await tx.update(agent_profiles).set({ license_verified: true, ...(r.submitted_data.license_no ? { license_no: r.submitted_data.license_no } : {}) })
          .where(eq(agent_profiles.user_id, r.user_id));
      }
      if (r.kind === "property_ownership" && r.property_id) {
        await tx.update(properties).set({ is_verified: true, verified_at: now }).where(eq(properties.id, r.property_id));
      }
    }
    await notify(tx, r.user_id, {
      type: "verification", title: decision === "approved" ? "ยืนยันข้อมูลสำเร็จ" : decision === "rejected" ? "การยืนยันข้อมูลไม่ผ่าน" : "กรุณาส่งข้อมูลเพิ่มเติม",
      body: note, link: "/me/verification", entityType: "verification_request", entityId: id,
    });
    await audit(tx, actor.id, `VERIFICATION_${decision.toUpperCase()}`, "verification_requests", id, r.kind, { note, user_id: r.user_id, property_id: r.property_id });
  });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export async function createReport(actor: Actor, v: { target_type: ReportTarget; target_id: string; reason: ReportReason; details?: string }) {
  requireActive(actor);
  await db.insert(reports).values({ ...v, details: v.details ?? null, reporter_id: actor.id });
}

// ---------------------------------------------------------------------------
// Dwelly Commission (Co-Agent)
// ---------------------------------------------------------------------------
/** Agent may see commission terms of this listing (approved per-listing or platform partner). */
export async function hasCommissionAccess(actor: Actor, propertyId: string) {
  const [r] = await db.select({ id: car.id }).from(car).where(and(
    eq(car.agent_id, actor.id), eq(car.status, "approved"), or(isNull(car.property_id), eq(car.property_id, propertyId)),
  )).limit(1);
  return Boolean(r);
}

export async function getCommissionForOwner(actor: Actor, propertyId: string) {
  const [p] = await db.select({ owner: properties.owner_id }).from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (p?.owner !== actor.id) return { program: null, requests: [] };
  const [[program], requests] = await Promise.all([
    db.select().from(commission_programs).where(eq(commission_programs.property_id, propertyId)).limit(1),
    db.select({ r: car, agent_name: profiles.display_name }).from(car).innerJoin(profiles, eq(profiles.id, car.agent_id))
      .where(eq(car.property_id, propertyId)).orderBy(desc(car.created_at)),
  ]);
  return { program: program ?? null, requests: requests.map((x) => ({ ...x.r, agent_name: x.agent_name })) };
}

export async function saveCommission(actor: Actor, v: Omit<typeof commission_programs.$inferInsert, "created_at" | "updated_at">) {
  requireActive(actor);
  const [p] = await db.select({ owner: properties.owner_id }).from(properties).where(eq(properties.id, v.property_id)).limit(1);
  if (p?.owner !== actor.id) throw forbidden("เฉพาะเจ้าของประกาศเท่านั้น");
  const { property_id, ...rest } = v;
  await db.insert(commission_programs).values(v).onDuplicateKeyUpdate({ set: rest });
  void property_id;
}

/** Programmes an agent may see: platform partner → all enabled; otherwise approved listings + own listings. */
export async function visibleCommissionPrograms(actor: Actor) {
  const partner = await db.select({ id: car.id }).from(car)
    .where(and(eq(car.agent_id, actor.id), eq(car.status, "approved"), isNull(car.property_id))).limit(1);
  const approved = await db.select({ pid: car.property_id }).from(car).where(and(eq(car.agent_id, actor.id), eq(car.status, "approved")));
  const ids = approved.map((a) => a.pid).filter((x): x is string => Boolean(x));
  const rows = await db.select({ c: commission_programs, p: properties }).from(commission_programs)
    .innerJoin(properties, eq(properties.id, commission_programs.property_id))
    .where(and(
      eq(commission_programs.enabled, true), eq(properties.status, "active"),
      partner.length ? undefined : or(eq(properties.agent_id, actor.id), ids.length ? inArray(properties.id, ids) : sql`false`),
    )).limit(50);
  return rows.filter((r) => r.p.owner_id !== actor.id);
}

export async function latestPartnerRequest(actor: Actor) {
  const [r] = await db.select().from(car).where(and(eq(car.agent_id, actor.id), isNull(car.property_id)))
    .orderBy(desc(car.created_at)).limit(1);
  return r ?? null;
}

export async function requestPartnerAccess(actor: Actor, message?: string) {
  requireActive(actor);
  if (!actor.roles.includes("agent")) throw forbidden("เฉพาะบัญชีนายหน้าเท่านั้น");
  const existing = await latestPartnerRequest(actor);
  if (existing && ["pending", "approved"].includes(existing.status)) throw new AppError("คุณส่งคำขอนี้ไปแล้ว");
  await db.insert(car).values({ agent_id: actor.id, property_id: null, message: message ?? null });
}

/** Decide an access request: listing owner for listing-scope requests, moderators for any; agents may revoke their own. */
export async function decideCommissionAccess(actor: Actor, id: string, status: "approved" | "rejected" | "revoked") {
  requireActive(actor);
  return db.transaction(async (tx) => {
    const [r] = await tx.select().from(car).where(eq(car.id, id)).limit(1).for("update");
    if (!r) throw notFound();
    let allowed = isStaff(actor, ["moderator"]);
    if (!allowed && r.property_id) {
      const [p] = await tx.select({ owner: properties.owner_id }).from(properties).where(eq(properties.id, r.property_id)).limit(1);
      allowed = p?.owner === actor.id;
    }
    if (!allowed && r.agent_id === actor.id && status === "revoked") allowed = true;
    if (!allowed) throw forbidden();
    await tx.update(car).set({ status, reviewed_by: actor.id, reviewed_at: new Date().toISOString() }).where(eq(car.id, id));
    await audit(tx, actor.id, `COMMISSION_ACCESS_${status.toUpperCase()}`, "commission_access_requests", id, null, { agent_id: r.agent_id, property_id: r.property_id });
    if (actor.id !== r.agent_id) {
      await notify(tx, r.agent_id, {
        type: "commission", title: status === "approved" ? "ได้รับสิทธิ์ Co-Agent แล้ว" : status === "rejected" ? "คำขอสิทธิ์ Co-Agent ไม่ผ่าน" : "สิทธิ์ Co-Agent ถูกยกเลิก",
        link: "/dashboard/agent", entityType: "commission_access", entityId: id,
      });
    }
    return r.property_id;
  });
}

export async function staffPartnerRequests(actor: Actor) {
  if (!isStaff(actor, ["moderator"])) throw forbidden();
  const rows = await db.select({ r: car, agent_name: profiles.display_name, agent_kyc: profiles.is_kyc_verified, ap: agent_profiles })
    .from(car).innerJoin(profiles, eq(profiles.id, car.agent_id)).leftJoin(agent_profiles, eq(agent_profiles.user_id, car.agent_id))
    .where(and(isNull(car.property_id), inArray(car.status, ["pending", "approved"]))).orderBy(desc(car.status), car.created_at);
  return rows.map((x) => ({ ...x.r, agent: { id: x.r.agent_id, display_name: x.agent_name, is_kyc_verified: x.agent_kyc }, agent_profile: x.ap }));
}

export async function staffPods(actor: Actor) {
  if (!isStaff(actor, ["verifier"])) throw forbidden();
  const rows = await db.select({
    pod: agency_pods, leader_name: profiles.display_name, zone_name: zones.name_th,
    members: sql<number>`(select count(*) from ${pod_members} pm where pm.pod_id = ${agency_pods.id})`,
  }).from(agency_pods).innerJoin(profiles, eq(profiles.id, agency_pods.leader_id)).leftJoin(zones, eq(zones.id, agency_pods.zone_id))
    .orderBy(agency_pods.status, desc(agency_pods.created_at));
  return rows.map((r) => ({ ...r.pod, leader_name: r.leader_name, zone_name: r.zone_name, members: Number(r.members) }));
}

export async function reviewPod(actor: Actor, id: string, status: "pending" | "verified" | "suspended", trustScore?: number, note?: string) {
  if (!isStaff(actor, ["verifier"])) throw forbidden();
  await db.transaction(async (tx: Tx) => {
    const [pod] = await tx.select().from(agency_pods).where(eq(agency_pods.id, id)).limit(1).for("update");
    if (!pod) throw notFound();
    await tx.update(agency_pods).set({ status, ...(trustScore != null ? { trust_score: trustScore } : {}) }).where(eq(agency_pods.id, id));
    await notify(tx, pod.leader_id, {
      type: "pod", title: status === "verified" ? "Pod ของคุณได้รับการยืนยันแล้ว" : "สถานะ Pod มีการเปลี่ยนแปลง", body: note, link: "/dashboard/agent", entityType: "pod", entityId: id,
    });
    await audit(tx, actor.id, `POD_${status.toUpperCase()}`, "agency_pods", id, note ?? null, { trust_score: trustScore });
  });
}

export async function latestOwnershipVerification(actor: Actor, propertyId: string) {
  const [r] = await db.select({ status: verification_requests.status, reviewer_note: verification_requests.reviewer_note })
    .from(verification_requests)
    .where(and(eq(verification_requests.property_id, propertyId), eq(verification_requests.user_id, actor.id)))
    .orderBy(desc(verification_requests.submitted_at)).limit(1);
  return r ?? null;
}

/** The listing's commission programme, if enabled and the actor may see it (owner, listing agent, or approved access). */
export async function commissionForViewer(actor: Actor | null, propertyId: string) {
  if (!actor) return null;
  const [row] = await db.select({ c: commission_programs, p: properties }).from(commission_programs)
    .innerJoin(properties, eq(properties.id, commission_programs.property_id))
    .where(and(eq(commission_programs.property_id, propertyId), eq(commission_programs.enabled, true))).limit(1);
  if (!row) return null;
  const mine = row.p.owner_id === actor.id || row.p.agent_id === actor.id;
  if (!mine && !(actor.roles.includes("agent") && (await hasCommissionAccess(actor, propertyId)))) return null;
  return { ...row.c, via: row.p.owner_id === actor.id ? ("owner" as const) : ("dwelly" as const) };
}

/** Members of the actor's pods with their listing and deal counts (design: Agency Dashboard "ทีมงานนายหน้า"). */
export async function podTeam(actor: Actor) {
  const mine = await myPods(actor);
  if (!mine.length) return [];
  const ids = mine.map((m) => m.pod.id);
  const rows = await db.select({
    pod_id: pod_members.pod_id, role: pod_members.role, user_id: profiles.id, name: profiles.display_name, avatar: profiles.avatar_url,
    closed: agent_profiles.closed_deals,
    listings: sql<number>`(select count(*) from ${properties} p where p.agent_id = ${pod_members.user_id} and p.status = 'active')`,
    leads: sql<number>`(select count(*) from inquiries i where i.seller_id = ${pod_members.user_id})`,
  }).from(pod_members).innerJoin(profiles, eq(profiles.id, pod_members.user_id))
    .leftJoin(agent_profiles, eq(agent_profiles.user_id, pod_members.user_id))
    .where(inArray(pod_members.pod_id, ids));
  return rows.map((r) => ({ ...r, closed: r.closed ?? 0, listings: Number(r.listings), leads: Number(r.leads) }));
}

/** The owner's listings with their Co-Agent programme and agents' access requests (design: Dwelly Commission). */
export async function ownerCommissionOverview(actor: Actor) {
  const rows = await db.select({ p: properties, c: commission_programs }).from(properties)
    .leftJoin(commission_programs, eq(commission_programs.property_id, properties.id))
    .where(and(eq(properties.owner_id, actor.id), inArray(properties.status, ["active", "reserved", "pending_review", "draft"])))
    .orderBy(desc(properties.updated_at));
  if (!rows.length) return [];
  const requests = await db.select({ r: car, agent_name: profiles.display_name, agent_code: agent_profiles.agent_code }).from(car)
    .innerJoin(profiles, eq(profiles.id, car.agent_id)).leftJoin(agent_profiles, eq(agent_profiles.user_id, car.agent_id))
    .where(inArray(car.property_id, rows.map((r) => r.p.id))).orderBy(desc(car.created_at));
  return rows.map(({ p, c }) => ({
    property: p, program: c,
    requests: requests.filter((x) => x.r.property_id === p.id).map((x) => ({ ...x.r, agent_name: x.agent_name, agent_code: x.agent_code })),
  }));
}

/** Listings with an enabled Co-Agent programme an agent may ask to join (rates stay hidden until approved). */
export async function openCommissionListings(actor: Actor, limit = 50) {
  requireActive(actor);
  const asked = await db.select({ pid: car.property_id, status: car.status }).from(car).where(eq(car.agent_id, actor.id));
  const rows = await db.select({ id: properties.id, owner_id: properties.owner_id, code: properties.code, title: properties.title, province: properties.province, category: properties.category })
    .from(commission_programs).innerJoin(properties, eq(properties.id, commission_programs.property_id))
    .where(and(eq(commission_programs.enabled, true), eq(properties.status, "active"))).orderBy(desc(properties.updated_at)).limit(limit);
  return rows.filter((r) => r.owner_id !== actor.id).map((r) => ({ id: r.id, code: r.code, title: r.title, province: r.province, category: r.category, request: asked.find((a) => a.pid === r.id)?.status ?? null }));
}

/** An agent asks a listing owner for Co-Agent access to one listing. */
export async function requestListingAccess(actor: Actor, propertyId: string, message?: string) {
  requireActive(actor);
  if (!actor.roles.includes("agent")) throw forbidden("เฉพาะบัญชีนายหน้าเท่านั้น");
  const [row] = await db.select({ p: properties, c: commission_programs }).from(properties)
    .innerJoin(commission_programs, eq(commission_programs.property_id, properties.id)).where(eq(properties.id, propertyId)).limit(1);
  if (!row || !row.c.enabled || row.p.status !== "active") throw new AppError("ประกาศนี้ไม่ได้เปิดรับ Co-Agent");
  if (row.p.owner_id === actor.id) throw new AppError("นี่คือประกาศของคุณ");
  const [existing] = await db.select({ status: car.status }).from(car)
    .where(and(eq(car.agent_id, actor.id), eq(car.property_id, propertyId), inArray(car.status, ["pending", "approved"]))).limit(1);
  if (existing) throw new AppError(existing.status === "approved" ? "คุณได้รับสิทธิ์แล้ว" : "ส่งคำขอไปแล้ว รอเจ้าของพิจารณา");
  await db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    await tx.insert(car).values({ id, agent_id: actor.id, property_id: propertyId, message: message?.trim().slice(0, 1000) || null });
    await notify(tx, row.p.owner_id, {
      type: "commission", title: "นายหน้าขอสิทธิ์ Co-Agent", body: row.p.title, link: "/dashboard/commission?tab=permissions", entityType: "commission_access", entityId: id,
    });
  });
}
