import type { Metadata } from "next";
import { PROVINCES } from "@/lib/constants";
import { formatDateTime, timeAgo } from "@/lib/format";
import { listAppointments } from "@/server/services/deals";
import { coverUrls } from "@/server/services/listings";
import { myBuyerRequests } from "@/server/services/requests";
import { loadScreenListings } from "../data";
import { BuyerCenterScreen } from "./buyer-center-screen";

export const metadata: Metadata = { title: "ศูนย์ผู้ซื้อ (Buyer Center)" };

const TABS = ["search-map", "reverse-match", "compare", "mortgage-transfer", "deed-zoning", "appointments"] as const;

export default async function BuyerCenterPage({ searchParams }: PageProps<"/buyer-center">) {
  const sp = await searchParams;
  const { properties, signedIn, viewer } = await loadScreenListings();
  const [requests, appts] = viewer ? await Promise.all([myBuyerRequests(viewer), listAppointments(viewer, "buyer")]) : [[], []];
  const covers = await coverUrls(appts.map((a) => a.property_id));
  const provinces = [...new Set([...PROVINCES, ...properties.map((p) => p.province)])];
  const tab = TABS.find((t) => t === sp.tab) ?? "search-map";
  return (
    <BuyerCenterScreen
      properties={properties}
      provinces={provinces}
      requests={requests.map((r) => ({
        id: r.id, deal: r.deal, category: r.category, province: r.province, area: r.area, max_budget: Number(r.max_budget), criteria: r.criteria,
        status: r.status, matched: r.matched, created: timeAgo(r.created_at),
      }))}
      appointments={appts.map((a) => ({
        id: a.id, code: a.properties.code, title: a.properties.title, image: covers.get(a.property_id) ?? null, seller: a.party.display_name,
        when: formatDateTime(a.scheduled_at), format: a.format, status: a.status,
      }))}
      signedIn={signedIn}
      userName={viewer?.profile.display_name ?? null}
      initialTab={tab}
    />
  );
}
