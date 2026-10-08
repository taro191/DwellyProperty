import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { activitySchedule } from "@/server/services/content";
import { nowMs } from "@/lib/format";
import { ActivitiesScreen, type ActivityItem } from "./activities-screen";

export const metadata: Metadata = { title: "ตารางกิจกรรม" };

const bkkDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);

export default async function ActivitiesPage() {
  const viewer = await getViewer();
  const rows = await activitySchedule(viewer?.id);
  const today = bkkDay(new Date());
  const tomorrow = bkkDay(new Date(nowMs() + 86_400_000));
  const items: ActivityItem[] = rows.map((a) => {
    const start = new Date(a.starts_at);
    const d = bkkDay(start);
    return {
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      time: start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }),
      day: d === today ? "today" : d === tomorrow ? "tomorrow" : "upcoming",
      dateLabel: start.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Bangkok" }),
      host: a.host_name,
      location: a.location,
      seatsLeft: a.seats_left,
      registered: a.registered,
    };
  });
  return <ActivitiesScreen items={items} signedIn={Boolean(viewer)} />;
}
