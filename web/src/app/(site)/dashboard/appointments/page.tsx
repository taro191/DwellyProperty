import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { listAppointments } from "@/server/services/deals";
import { EmptyState, PageHeader } from "@/components/ui";
import { AppointmentCard } from "@/components/deals";
import { nowMs } from "@/lib/format";

export const metadata: Metadata = { title: "นัดหมาย" };

export default async function SellerAppointmentsPage() {
  const viewer = await requireViewer("/dashboard/appointments");
  const rows = await listAppointments(viewer, "seller");
  const now = nowMs();
  const upcoming = rows.filter((a) => new Date(a.scheduled_at).getTime() >= now || a.status === "pending");
  const past = rows.filter((a) => !upcoming.includes(a)).reverse();

  return (
    <div className="space-y-8">
      <PageHeader title="นัดหมายชมทรัพย์" subtitle="ยืนยัน ปฏิเสธ หรือบันทึกผลการนัดชม" />
      <section className="space-y-3">
        <h2 className="font-bold">กำลังจะมาถึง</h2>
        {upcoming.length === 0 ? <EmptyState title="ไม่มีนัดหมายที่กำลังจะมาถึง" /> : upcoming.map((a) => (
          <AppointmentCard key={a.id} a={a} side="seller" property={a.properties} other={a.party} />
        ))}
      </section>
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold">ที่ผ่านมา</h2>
          {past.map((a) => <AppointmentCard key={a.id} a={a} side="seller" property={a.properties} other={a.party} />)}
        </section>
      )}
    </div>
  );
}
