import { notFound } from "next/navigation";
import { loadZonesScreen } from "../../data";
import { ZonesScreen } from "../zones-screen";

export default async function ZonePage({ params }: PageProps<"/zones/[slug]">) {
  const { slug } = await params;
  const data = await loadZonesScreen();
  if (!data.zones.some((z) => z.slug === slug)) notFound();
  return <ZonesScreen {...data} selected={slug} />;
}
