import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { getHub } from "@/server/services/content";
import { favoriteIds } from "@/server/services/listings";
import { PropertyGrid } from "@/components/property-card";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/hubs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getHub(slug);
  return data ? { title: data.hub.name, description: data.hub.description ?? undefined } : { title: "ไม่พบ Hub" };
}

export default async function HubPage({ params }: PageProps<"/hubs/[slug]">) {
  const { slug } = await params;
  const viewer = await getViewer();
  const [data, favorites] = await Promise.all([getHub(slug), favoriteIds(viewer?.id)]);
  if (!data) notFound();
  const { hub, items } = data;

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
