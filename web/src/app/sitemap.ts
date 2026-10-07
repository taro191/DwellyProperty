import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/hubs`, changeFrequency: "daily" },
    { url: `${SITE_URL}/plans`, changeFrequency: "monthly" },
  ];
  if (!isSupabaseConfigured) return base;
  // Anonymous client: only publicly visible listings.
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data } = await supabase.from("properties").select("code, updated_at").eq("status", "active").limit(50000);
  return [
    ...base,
    ...(data ?? []).map((p) => ({ url: `${SITE_URL}/property/${p.code}`, lastModified: p.updated_at, changeFrequency: "weekly" as const })),
  ];
}
