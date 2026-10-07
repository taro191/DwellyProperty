import type { Metadata } from "next";
import Link from "next/link";
import { listHubs, myRegistrations, upcomingActivities } from "@/server/services/content";
import { getViewer } from "@/lib/auth";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ActivityRegisterButton } from "./register-button";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dwelly Hubs & กิจกรรม" };

const ACTIVITY_LABEL: Record<string, string> = {
  live_tour: "ทัวร์สด", open_house: "Open House", live_qa: "ถาม-ตอบสด", workshop: "เวิร์กช็อป", consultation: "ปรึกษา",
};

export default async function HubsPage() {
  const viewer = await getViewer();
  const [hubs, activities, registered] = await Promise.all([
    listHubs(["live", "scheduled"]),
    upcomingActivities(20),
    myRegistrations(viewer?.id),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader title="Dwelly Hubs & กิจกรรม" subtitle="แคมเปญรวมทรัพย์ตามธีม ทัวร์สด และเวิร์กช็อป" />
      <section className="space-y-3">
        {hubs.length === 0 ? <EmptyState title="ยังไม่มี Hub ที่เปิดอยู่" /> : hubs.map((h) => (
          <Link key={h.id} href={`/hubs/${h.slug}`}>
            <Card className="p-5 transition-colors hover:border-accent/50">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={h.status === "live" ? "accent" : "warning"}>{h.status === "live" ? "กำลังจัด" : "เร็วๆ นี้"}</Badge>
                <span className="text-xs text-subtle">{formatDate(h.starts_at)} – {formatDate(h.ends_at)}</span>
              </div>
              <p className="mt-2 text-lg font-bold">{h.name}</p>
              {h.description && <p className="text-sm text-subtle">{h.description}</p>}
              <p className="mt-2 text-xs text-accent">{h.property_count} ทรัพย์ในงาน</p>
            </Card>
          </Link>
        ))}
      </section>
      <section>
        <h2 className="mb-4 text-xl font-extrabold">กิจกรรมที่กำลังจะมาถึง</h2>
        {activities.length === 0 ? <EmptyState title="ยังไม่มีกิจกรรม" /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {activities.map((a) => (
              <Card key={a.id} className="p-5">
                <div className="flex items-center gap-2">
                  <Badge tone="info">{ACTIVITY_LABEL[a.type] ?? a.type}</Badge>
                  <span className="text-xs text-accent">{formatDateTime(a.starts_at)}</span>
                </div>
                <p className="mt-2 font-bold">{a.title}</p>
                {a.description && <p className="text-sm text-subtle">{a.description}</p>}
                <div className="mt-3">
                  <ActivityRegisterButton activityId={a.id} registered={registered.has(a.id)} signedIn={Boolean(viewer)} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
