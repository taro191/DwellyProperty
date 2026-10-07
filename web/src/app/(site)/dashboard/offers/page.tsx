import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { listOffers } from "@/server/services/deals";
import { EmptyState, PageHeader } from "@/components/ui";
import { OfferCard } from "@/components/deals";

export const metadata: Metadata = { title: "ข้อเสนอ" };

export default async function SellerOffersPage() {
  const viewer = await requireViewer("/dashboard/offers");
  const rows = await listOffers(viewer, "seller");

  return (
    <div>
      <PageHeader title="ข้อเสนอซื้อ / เช่า" subtitle="ตอบรับ ปฏิเสธ หรือเสนอราคากลับ" />
      {rows.length === 0 ? (
        <EmptyState title="ยังไม่มีข้อเสนอ" />
      ) : (
        <div className="space-y-3">
          {rows.map((o) => <OfferCard key={o.id} o={o} side="seller" property={o.properties} other={o.party} />)}
        </div>
      )}
    </div>
  );
}
