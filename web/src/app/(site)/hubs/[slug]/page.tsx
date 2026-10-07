import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LISTING_SELECT, getFavoriteIds } from "@/lib/queries";
import { PropertyGrid } from "@/components/property-card";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { PropertyWithMedia } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/hubs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("hubs").select("name, description").eq("slug", slug).maybeSingle();
  return data ? { title: data.name, description: data.description ?? undefined } : { title: "ไม่พบ Hub" };
}

export default async function HubPage({ params }: PageProps<"/hubs/[slug]">) {
  const { slug } = await params;
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: hub } = await supabase.from("hubs").select("*").eq("slug", slug).maybeSingle();
  if (!hub) notFound();
  const [{ data: rows }, favorites] = await Promise.all([
    supabase.from("hub_properties").select(`properties(${LISTING_SELECT})`).eq("hub_id", hub.id),
    getFavoriteIds(viewer?.id),
  ]);
  const items = (rows ?? []).map((r) => r.properties as unknown as PropertyWithMedia).filter((p) => p && p.status === "active");

  return (
    <div>
      <PageHeader
        title={hub.name}
        subtitle={<span className="flex flex-wrap items-center gap-2">
          <Badge tone={hub.status === "live" ? "accent" : "neutral"}>{hub.status === "live" ? "กำลังจัด" : hub.status === "ended" ? "จบแล้ว" : "เร็วๆ นี้"}</Badge>
          {formatDateTime(hub.starts_at)} – {formatDateTime(hub.ends_at)}
        </span>}
      />
      {hub.description && <p className="mb-6 text-muted">{hub.description}</p>}
      {items.length === 0 ? <EmptyState title="ยังไม่มีทรัพย์ใน Hub นี้" /> : <PropertyGrid items={items} favorites={favorites} signedIn={Boolean(viewer)} />}
    </div>
  );
}
