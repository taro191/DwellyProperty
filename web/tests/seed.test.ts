/** The full seed (users of every type + sample activity through the services) runs cleanly on an empty database. */
import { afterAll, beforeAll, expect, it } from "vitest";
import { createDB } from "mysql-memory-server";
import { eq } from "drizzle-orm";

let server: Awaited<ReturnType<typeof createDB>>;

beforeAll(async () => {
  server = await createDB({ version: "8.4.x", logLevel: "ERROR" });
  process.env.DATABASE_URL = `mysql://${server.username}@127.0.0.1:${server.port}/${server.dbName}`;
  process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";
  const { runMigrations } = await import("../scripts/migrate");
  await runMigrations(process.env.DATABASE_URL);
});

afterAll(async () => {
  await server?.stop();
});

it("seeds one account per user type with sample activity and test emails", async () => {
  const { seed } = await import("../scripts/seed");
  const { db } = await import("@/server/db");
  const t = await import("@/server/db/schema");
  const U = (await seed({ email: (k) => `test.${k}@example.com`, password: "Test-Pass-123" }))!;

  expect(Object.keys(U).sort()).toEqual(["admin", "agent", "buyer", "finance", "investor", "moderator", "owner", "owner2", "support", "tenant", "verifier"]);
  const [admin] = await db.select().from(t.user).where(eq(t.user.email, "test.admin@example.com"));
  expect(admin.id).toBe(U.admin);
  const staff = await db.select().from(t.staff_members);
  expect(staff.map((s) => s.role).sort()).toEqual(["finance", "moderator", "super_admin", "support", "verifier"]);

  for (const table of [t.inquiries, t.appointments, t.offers, t.conversations, t.messages, t.favorites, t.reports, t.verification_requests, t.notifications]) {
    expect((await db.select().from(table)).length).toBeGreaterThan(0);
  }
  expect((await db.select().from(t.orders).where(eq(t.orders.status, "paid"))).length).toBe(4);
  expect((await db.select().from(t.properties).where(eq(t.properties.status, "pending_review"))).length).toBe(1);
  // Running again is a no-op.
  expect(await seed({ email: (k) => `test.${k}@example.com` })).toBeUndefined();
});
