import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { SITE_URL, isConfigured } from "@/lib/env";
import { db } from "@/server/db";
import { properties } from "@/server/db/schema";

export const revalidate = 3600;
export const dynamic = "force-dynamic"; // needs the database, so never build it at compile time

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/hubs`, changeFrequency: "daily" },
    { url: `${SITE_URL}/plans`, changeFrequency: "monthly" },
  ];
  if (!isConfigured) return base;
  const rows = await db.select({ code: properties.code, updated_at: properties.updated_at }).from(properties)
    .where(eq(properties.status, "active")).limit(50000);
  return [...base, ...rows.map((p) => ({ url: `${SITE_URL}/property/${p.code}`, lastModified: p.updated_at, changeFrequency: "weekly" as const }))];
}
