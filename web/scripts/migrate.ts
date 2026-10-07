/** Apply drizzle/ migrations to DATABASE_URL.  Usage: npm run db:migrate */
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createDb, createPool } from "@/server/db";

export async function runMigrations(url: string) {
  const pool = createPool(url);
  try {
    await migrate(createDb(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  runMigrations(url).then(() => console.log("✓ migrations applied"), (e) => {
    console.error(e);
    process.exit(1);
  });
}
