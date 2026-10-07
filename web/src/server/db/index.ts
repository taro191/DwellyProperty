import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export type DB = MySql2Database<typeof schema>;

export function createPool(url: string) {
  return mysql.createPool({
    uri: url,
    // DATETIME values are UTC; keep them as strings so the schema maps them to ISO.
    dateStrings: true,
    timezone: "Z",
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
    charset: "utf8mb4_unicode_ci",
    supportBigNumbers: true,
  });
}

export function createDb(pool: mysql.Pool): DB {
  return drizzle(pool, { schema, mode: "default" });
}

// One pool per server process (survives Next dev hot reloads).
const g = globalThis as unknown as { __dwellyPool?: mysql.Pool; __dwellyDb?: DB };

export function getDb(): DB {
  if (!g.__dwellyDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__dwellyPool = createPool(url);
    g.__dwellyDb = createDb(g.__dwellyPool);
  }
  return g.__dwellyDb;
}

/** Lazy proxy so importing this module never opens a connection at build time. */
export const db = new Proxy({} as DB, {
  get: (_t, prop) => Reflect.get(getDb(), prop),
});

/** Test hook: point the app at another database. */
export function setDbForTests(instance: DB) {
  g.__dwellyDb = instance;
}

export { schema };
