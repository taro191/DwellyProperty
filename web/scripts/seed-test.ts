/**
 * Test accounts for the testing phase on a real server: one account per user type (buyer, tenant,
 * owner ×2, investor, agent and every staff role) with the full demo data and sample activity.
 *
 *   npm run seed:test -- --domain dwellyproperty.yaydang.com [--password '...']
 *
 * Emails are test.<type>@<domain>. Without --password a random one is generated and printed once.
 * Runs only on an empty database (no plans yet) or when the test accounts are absent.
 */
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { seed } from "./seed";

const { values } = parseArgs({ options: { domain: { type: "string" }, password: { type: "string" } } });
const domain = values.domain?.trim().toLowerCase();
if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
  console.error("usage: npm run seed:test -- --domain example.com [--password '...']");
  process.exit(1);
}
const password = values.password ?? `Dw-${randomBytes(9).toString("base64url")}`;
if (password.length < 8) {
  console.error("password must be at least 8 characters");
  process.exit(1);
}

const LABEL: Record<string, string> = {
  admin: "Super Admin", moderator: "Moderator", verifier: "Verifier", support: "Support", finance: "Finance",
  buyer: "ผู้ซื้อ", tenant: "ผู้เช่า", owner: "เจ้าของทรัพย์ (ขาย)", owner2: "เจ้าของทรัพย์ (ให้เช่า)", investor: "นักลงทุน", agent: "นายหน้า",
};

seed({ email: (k) => `test.${k}@${domain}`, password }).then((U) => {
  if (!U) process.exit(0);
  console.log("\nTest accounts (sign in with the 'รหัสผ่าน' tab):");
  for (const k of Object.keys(U)) console.log(`  ${(LABEL[k] ?? k).padEnd(24)} test.${k}@${domain}`);
  console.log(`  password (all accounts)  ${values.password ? "(as given)" : password}`);
  process.exit(0);
}, (e) => {
  console.error(e);
  process.exit(1);
});
