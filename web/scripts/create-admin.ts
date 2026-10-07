/**
 * Create (or promote) a staff account that can sign in with email + password.
 * Idempotent: an existing user gets the new password and the staff role.
 *
 *   npm run admin:create -- --email you@example.com --password '<strong password>' [--name "Your Name"] [--role super_admin]
 *
 * On Plesk: Node.js → Run Node.js commands →
 *   run admin:create -- --email you@example.com --password '<strong password>'
 */
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/server/db";
import * as t from "@/server/db/schema";
import { CONSENT_VERSION } from "@/lib/constants";

type StaffRole = (typeof t.STAFF_ROLES)[number];

export async function createAdmin(opts: { email: string; password: string; name?: string; role?: StaffRole }) {
  const email = opts.email.trim().toLowerCase();
  const role = opts.role ?? "super_admin";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
  if (opts.password.length < 8) throw new Error("Password must be at least 8 characters");
  if (!t.STAFF_ROLES.includes(role)) throw new Error(`Role must be one of: ${t.STAFF_ROLES.join(", ")}`);

  const hash = await hashPassword(opts.password);
  const now = new Date();
  const name = opts.name?.trim() || email.split("@")[0];

  return db.transaction(async (tx) => {
    let [u] = await tx.select().from(t.user).where(eq(t.user.email, email)).limit(1);
    const created = !u;
    if (!u) {
      const id = crypto.randomUUID();
      await tx.insert(t.user).values({ id, email, name, emailVerified: true, createdAt: now, updatedAt: now });
      [u] = await tx.select().from(t.user).where(eq(t.user.id, id)).limit(1);
    }

    // Password login (Better Auth "credential" account).
    const [cred] = await tx.select().from(t.account)
      .where(and(eq(t.account.userId, u.id), eq(t.account.providerId, "credential"))).limit(1);
    if (cred) await tx.update(t.account).set({ password: hash, updatedAt: now }).where(eq(t.account.id, cred.id));
    else await tx.insert(t.account).values({ id: crypto.randomUUID(), userId: u.id, accountId: u.id, providerId: "credential", password: hash, createdAt: now, updatedAt: now });

    const [p] = await tx.select().from(t.profiles).where(eq(t.profiles.id, u.id)).limit(1);
    if (!p) {
      await tx.insert(t.profiles).values({ id: u.id, display_name: name.slice(0, 80), onboarded_at: now.toISOString() });
      await tx.insert(t.user_roles).ignore().values({ user_id: u.id, role: "buyer" });
      for (const kind of ["terms", "privacy"] as const) {
        await tx.insert(t.consents).values({ user_id: u.id, kind, version: CONSENT_VERSION, granted: true });
      }
    } else if (p.status !== "active") {
      await tx.update(t.profiles).set({ status: "active", status_reason: null }).where(eq(t.profiles.id, u.id));
    }

    await tx.insert(t.staff_members).values({ user_id: u.id, role, active: true })
      .onDuplicateKeyUpdate({ set: { role, active: true } });
    await tx.insert(t.audit_logs).values({
      actor_id: null, action: "STAFF_SET", entity_type: "staff_members", entity_id: u.id, summary: `${role} via CLI`, data: { email },
    });
    return { id: u.id, email, role, created };
  });
}

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

if (process.argv[1]?.endsWith("create-admin.ts")) {
  const email = arg("email");
  const password = arg("password");
  if (!email || !password) {
    console.error("Usage: npm run admin:create -- --email you@example.com --password '<strong password>' [--name \"Name\"] [--role super_admin]");
    process.exit(1);
  }
  createAdmin({ email, password, name: arg("name"), role: arg("role") as StaffRole | undefined }).then(
    (r) => {
      console.log(`✓ ${r.created ? "created" : "updated"} ${r.email} as ${r.role}`);
      process.exit(0);
    },
    (e) => {
      console.error("✗", e instanceof Error ? e.message : e);
      process.exit(1);
    },
  );
}
