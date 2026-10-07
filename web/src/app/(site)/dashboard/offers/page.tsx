import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui";
import { OfferCard } from "@/components/deals";
import type { Offer } from "@/lib/types";

export const metadata: Metadata = { title: "ข้อเสนอ" };

type Row = Offer & { properties: { title: string; code: string } | null; buyer: { display_name: string } | null };

export default async function SellerOffersPage() {
  const viewer = await requireViewer("/dashboard/offers");
  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select("*, properties(title, code), buyer:profiles!offers_buyer_id_fkey(display_name)")
    .eq("seller_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <PageHeader title="ข้อเสนอซื้อ / เช่า" subtitle="ตอบรับ ปฏิเสธ หรือเสนอราคากลับ" />
      {rows.length === 0 ? (
        <EmptyState title="ยังไม่มีข้อเสนอ" />
      ) : (
        <div className="space-y-3">
          {rows.map((o) => <OfferCard key={o.id} o={o} side="seller" property={o.properties} other={o.buyer} />)}
        </div>
      )}
    </div>
  );
}
