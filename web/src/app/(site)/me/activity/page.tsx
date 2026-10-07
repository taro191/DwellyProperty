import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { listAppointments, listInquiries, listOffers } from "@/server/services/deals";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { AppointmentCard, OfferCard } from "@/components/deals";
import { INTENT_LABEL } from "@/lib/constants";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "นัดหมายและข้อเสนอของฉัน" };

export default async function MyActivityPage() {
  const viewer = await requireViewer("/me/activity");
  const [appts, offers, inquiries] = await Promise.all([
    listAppointments(viewer, "buyer"),
    listOffers(viewer, "buyer"),
    listInquiries(viewer, "buyer"),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="นัดหมายและข้อเสนอของฉัน" subtitle="ติดตามสถานะการติดต่อทรัพย์ที่คุณสนใจ" />
      <section className="space-y-3">
        <h2 className="font-bold">นัดชม</h2>
        {appts.length === 0 ? <EmptyState title="ยังไม่มีนัดชม" /> : appts.map((a) => (
          <AppointmentCard key={a.id} a={a} side="buyer" property={a.properties} other={a.party} />
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-bold">ข้อเสนอ</h2>
        {offers.length === 0 ? <EmptyState title="ยังไม่มีข้อเสนอ" /> : offers.map((o) => (
          <OfferCard key={o.id} o={o} side="buyer" property={o.properties} other={o.party} />
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-bold">ข้อความที่ส่งถึงผู้ขาย</h2>
        {inquiries.length === 0 ? <EmptyState title="ยังไม่ได้ส่งข้อความ" /> : (
          <Card className="divide-y divide-line">
            {inquiries.map((i) => (
              <div key={i.id} className="px-4 py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <Link href={`/property/${i.properties?.code}`} className="font-semibold hover:text-accent">{i.properties?.title}</Link>
                  <span className="shrink-0 text-xs text-subtle">{timeAgo(i.created_at)}</span>
                </div>
                <p className="text-xs text-subtle">{INTENT_LABEL[i.intent]} · <Badge>{i.status === "new" ? "ส่งแล้ว" : "ผู้ขายรับเรื่องแล้ว"}</Badge></p>
                {i.message && <p className="mt-1 line-clamp-2 text-muted">{i.message}</p>}
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
