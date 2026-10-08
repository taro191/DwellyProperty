import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { landSizeLabel } from "@/lib/listing-view";
import { loadPropertyDetail } from "../detail";
import { OfferScreen } from "./offer-screen";

export const metadata: Metadata = { title: "ยื่นข้อเสนอราคา" };

export default async function OfferPage({ params }: PageProps<"/property/[code]/offer">) {
  const { code } = await params;
  if (!(await getViewer())) redirect(`/login?next=/property/${code}/offer`);
  const d = await loadPropertyDetail(code);
  if (!d) notFound();
  if (d.isMine || !d.accepting) redirect(`/property/${d.view.code}`);
  const v = d.view;
  return (
    <OfferScreen
      property={{
        id: v.id,
        code: v.code,
        name: v.name,
        image: d.images[0],
        location: v.location,
        sizeLabel: v.land ? landSizeLabel(v.land) : `${v.size} ตร.ม.`,
        isLand: Boolean(v.land),
        deedType: v.land?.deedType ?? null,
        salePrice: v.listingType !== "rent" ? d.salePrice : null,
        rentPrice: v.listingType !== "sale" ? v.rentPrice : null,
      }}
    />
  );
}
