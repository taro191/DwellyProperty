import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORY_LABEL, LISTING_TYPE_LABEL } from "@/lib/constants";
import { formatTHB } from "@/lib/format";
import { loadPropertyDetail } from "./detail";
import { PropertyScreen } from "./property-screen";
import { ViewTracker } from "./view-tracker";

export async function generateMetadata({ params }: PageProps<"/property/[code]">): Promise<Metadata> {
  const { code } = await params;
  const d = await loadPropertyDetail(code);
  if (!d) return { title: "ไม่พบประกาศ" };
  const v = d.view;
  const price = v.listingType === "rent" ? `${formatTHB(v.rentPrice)}/เดือน` : formatTHB(d.salePrice);
  const description = `${CATEGORY_LABEL[v.category]} ${LISTING_TYPE_LABEL[v.listingType]} ${price} · ${v.location}`;
  return {
    title: v.name,
    description,
    alternates: { canonical: `/property/${v.code}` },
    openGraph: { title: v.name, description, images: [{ url: d.images[0] }] },
    robots: d.status === "active" ? undefined : { index: false },
  };
}

export default async function PropertyPage({ params }: PageProps<"/property/[code]">) {
  const { code } = await params;
  const d = await loadPropertyDetail(code);
  if (!d) notFound();
  const v = d.view;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: v.name,
    url: `/property/${v.code}`,
    datePosted: v.createdAt,
    image: d.images,
    offers: { "@type": "Offer", priceCurrency: "THB", price: v.listingType === "rent" ? v.rentPrice : d.salePrice },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ViewTracker propertyId={v.id} />
      <PropertyScreen d={d} />
    </>
  );
}
