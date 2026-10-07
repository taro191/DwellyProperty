export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** False until .env.local has a database and auth secret — the app shows /setup instead of crashing. */
export const isConfigured = Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
