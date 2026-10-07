/**
 * Create (or promote) a staff account that can sign in with email + password.
 * Idempotent: an existing user gets the new password and the staff role.
 *
 *   npm run admin:create -- --email you@example.com --password '<strong password>' [--name "Your Name"] [--role super_admin]
 *
 * On Plesk: Node.js → Run Node.js commands →
 *   run admin:create -- --email you@example.com --password '<strong password>'
 */
import * as t from "@/server/db/schema";
import { provisionAccount } from "@/server/services/accounts";

type StaffRole = (typeof t.STAFF_ROLES)[number];

export async function createAdmin(opts: { email: string; password: string; name?: string; role?: StaffRole }) {
  const role = opts.role ?? "super_admin";
  if (!t.STAFF_ROLES.includes(role)) throw new Error(`Role must be one of: ${t.STAFF_ROLES.join(", ")}`);
  const r = await provisionAccount(null, { email: opts.email, name: opts.name, password: opts.password, staffRole: role });
  return { ...r, role };
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
