import "server-only";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/server/db";
import * as t from "@/server/db/schema";
import { AppError, audit, forbidden, isStaff, notFound, type Actor, type Tx } from "./core";
import { CONSENT_VERSION } from "@/lib/constants";
import type { AppRole, StaffRole } from "@/lib/types";

export const MIN_PASSWORD = 8;

function checkPassword(password: string) {
  if (password.length < MIN_PASSWORD) throw new AppError(`รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`);
}

async function setPasswordTx(tx: Tx, userId: string, password: string) {
  checkPassword(password);
  const hash = await hashPassword(password);
  const now = new Date();
  const [cred] = await tx.select().from(t.account)
    .where(and(eq(t.account.userId, userId), eq(t.account.providerId, "credential"))).limit(1);
  if (cred) await tx.update(t.account).set({ password: hash, updatedAt: now }).where(eq(t.account.id, cred.id));
  else await tx.insert(t.account).values({ id: crypto.randomUUID(), userId, accountId: userId, providerId: "credential", password: hash, createdAt: now, updatedAt: now });
}

async function setStaffRoleTx(tx: Tx, actorId: string | null, userId: string, role: StaffRole | null) {
  if (role) {
    await tx.insert(t.staff_members).values({ user_id: userId, role, active: true, created_by: actorId })
      .onDuplicateKeyUpdate({ set: { role, active: true } });
  } else {
    await tx.update(t.staff_members).set({ active: false }).where(eq(t.staff_members.user_id, userId));
  }
  await audit(tx, actorId, "STAFF_SET", "staff_members", userId, role ?? "removed", { active: Boolean(role) });
}

export interface ProvisionInput {
  email: string;
  name?: string;
  password?: string;
  staffRole?: StaffRole | null;
  appRoles?: AppRole[];
}

/**
 * Create a ready-to-use account (or update an existing one): verified email, profile,
 * optional password login and staff role. Trusted callers only — `createUserAsAdmin`
 * and the `admin:create` CLI.
 */
export async function provisionAccount(actorId: string | null, v: ProvisionInput) {
  const email = v.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("อีเมลไม่ถูกต้อง");
  if (v.password) checkPassword(v.password);
  const name = (v.name?.trim() || email.split("@")[0]).slice(0, 80);
  const now = new Date();

  return db.transaction(async (tx) => {
    let [u] = await tx.select().from(t.user).where(eq(t.user.email, email)).limit(1);
    const created = !u;
    if (!u) {
      const id = crypto.randomUUID();
      await tx.insert(t.user).values({ id, email, name, emailVerified: true, createdAt: now, updatedAt: now });
      [u] = await tx.select().from(t.user).where(eq(t.user.id, id)).limit(1);
    }
    const [p] = await tx.select().from(t.profiles).where(eq(t.profiles.id, u.id)).limit(1);
    if (!p) {
      await tx.insert(t.profiles).values({ id: u.id, display_name: name, onboarded_at: now.toISOString() });
      for (const kind of ["terms", "privacy"] as const) {
        await tx.insert(t.consents).values({ user_id: u.id, kind, version: CONSENT_VERSION, granted: true });
      }
    } else if (p.status === "deleted") {
      throw new AppError("บัญชีนี้ถูกลบตามคำขอ PDPA แล้ว ใช้อีเมลอื่น");
    }
    const roles = Array.from(new Set<AppRole>(["buyer", ...(v.appRoles ?? [])]));
    await tx.insert(t.user_roles).ignore().values(roles.map((role) => ({ user_id: u.id, role })));
    if (v.password) await setPasswordTx(tx, u.id, v.password);
    if (v.staffRole !== undefined) await setStaffRoleTx(tx, actorId, u.id, v.staffRole);
    await audit(tx, actorId, created ? "USER_CREATED" : "USER_UPDATED", "profiles", u.id, email, { staff_role: v.staffRole ?? null });
    return { id: u.id, email, created };
  });
}

// ---------------------------------------------------------------------------
// Super-admin actions
// ---------------------------------------------------------------------------
function requireSuperAdmin(actor: Actor) {
  if (!isStaff(actor, ["super_admin"])) throw forbidden("เฉพาะ Super Admin เท่านั้น");
}

export async function createUserAsAdmin(actor: Actor, v: ProvisionInput) {
  requireSuperAdmin(actor);
  const [existing] = await db.select({ id: t.user.id }).from(t.user).where(eq(t.user.email, v.email.trim().toLowerCase())).limit(1);
  if (existing) throw new AppError("อีเมลนี้มีบัญชีอยู่แล้ว — แก้สิทธิ์ได้ที่หน้าข้อมูลผู้ใช้");
  return provisionAccount(actor.id, v);
}

export async function setStaffRole(actor: Actor, userId: string, role: StaffRole | null) {
  requireSuperAdmin(actor);
  if (userId === actor.id && role !== "super_admin") throw new AppError("ไม่สามารถลดสิทธิ์ของตัวเองได้");
  const [u] = await db.select({ id: t.profiles.id, status: t.profiles.status }).from(t.profiles).where(eq(t.profiles.id, userId)).limit(1);
  if (!u) throw notFound("ไม่พบผู้ใช้");
  if (u.status === "deleted") throw new AppError("บัญชีนี้ถูกลบแล้ว");
  await db.transaction((tx) => setStaffRoleTx(tx, actor.id, userId, role));
}

export async function setPasswordAsAdmin(actor: Actor, userId: string, password: string) {
  requireSuperAdmin(actor);
  const [u] = await db.select({ id: t.user.id }).from(t.user).where(eq(t.user.id, userId)).limit(1);
  if (!u) throw notFound("ไม่พบผู้ใช้");
  await db.transaction(async (tx) => {
    await setPasswordTx(tx, userId, password);
    // Sign the user out everywhere so the new password takes effect.
    await tx.delete(t.session).where(eq(t.session.userId, userId));
    await audit(tx, actor.id, "PASSWORD_RESET", "profiles", userId, "by super admin");
  });
}

/** True when a super admin has switched off sign-in for this user. Used by the auth hook. */
export async function isLoginDisabled(userId: string) {
  const [p] = await db.select({ off: t.profiles.login_disabled }).from(t.profiles).where(eq(t.profiles.id, userId)).limit(1);
  return Boolean(p?.off);
}

/** Enable/disable sign-in for a user. Disabling also ends all of their sessions. */
export async function setLoginEnabled(actor: Actor, userId: string, enabled: boolean, reason?: string | null) {
  requireSuperAdmin(actor);
  if (userId === actor.id) throw new AppError("ไม่สามารถปิดการเข้าสู่ระบบของตัวเองได้");
  if (!enabled && !reason?.trim()) throw new AppError("กรุณาระบุเหตุผล");
  const [p] = await db.select({ id: t.profiles.id }).from(t.profiles).where(eq(t.profiles.id, userId)).limit(1);
  if (!p) throw notFound("ไม่พบผู้ใช้");
  await db.transaction(async (tx) => {
    await tx.update(t.profiles)
      .set({ login_disabled: !enabled, login_disabled_reason: enabled ? null : reason!.trim().slice(0, 300) })
      .where(eq(t.profiles.id, userId));
    if (!enabled) await tx.delete(t.session).where(eq(t.session.userId, userId));
    await audit(tx, actor.id, enabled ? "LOGIN_ENABLED" : "LOGIN_DISABLED", "profiles", userId, reason ?? null);
  });
}
