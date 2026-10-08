import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { formatTHB, timeAgo } from "@/lib/format";
import { latestPartnerRequest, openCommissionListings, ownerCommissionOverview, visibleCommissionPrograms } from "@/server/services/trust";
import { CommissionScreen } from "./commission-screen";

export const metadata: Metadata = { title: "ระบบ Dwelly Commission" };

const TABS = ["calculator", "properties", "permissions", "expert"] as const;

export default async function CommissionPage({ searchParams }: PageProps<"/dashboard/commission">) {
  const viewer = await requireViewer("/dashboard/commission");
  const sp = await searchParams;
  const tab = TABS.find((t) => t === sp.tab) ?? "calculator";
  const overview = await ownerCommissionOverview(viewer);
  const isAgent = viewer.roles.includes("agent") && viewer.profile.primary_role === "agent";
  const mode = overview.length > 0 && !isAgent ? "owner" : isAgent ? "agent" : overview.length > 0 ? "owner" : "agent";
  const [partner, programs, open] = mode === "agent"
    ? await Promise.all([latestPartnerRequest(viewer), visibleCommissionPrograms(viewer), openCommissionListings(viewer)])
    : [null, [], []];
  const visible = new Set(programs.map((x) => x.p.id));
  return (
    <CommissionScreen
      mode={mode}
      initialTab={tab}
      partner={partner?.status ?? null}
      ownerListings={overview.map(({ property: p, program: c, requests }) => ({
        id: p.id, code: p.code, title: p.title, price: p.listing_type === "rent" ? `${formatTHB(p.rent_price)}/เดือน` : formatTHB(p.sale_price),
        enabled: Boolean(c?.enabled), saleRate: c?.sale_rate_pct != null ? Number(c.sale_rate_pct) : null, rentRate: c?.rent_month1_rate_pct != null ? Number(c.rent_month1_rate_pct) : null,
        sells: p.listing_type !== "rent", rents: p.listing_type !== "sale",
        requests: requests.map((r) => ({ id: r.id, agent: r.agent_name, code: r.agent_code, status: r.status, message: r.message, when: timeAgo(r.created_at) })),
      }))}
      programs={programs.map(({ c, p }) => ({
        id: p.id, code: p.code, title: p.title,
        detail: [
          c.sale_rate_pct != null && p.sale_price ? `ขาย ${c.sale_rate_pct}% (${formatTHB((Number(p.sale_price) * Number(c.sale_rate_pct)) / 100)})` : null,
          c.rent_month1_rate_pct != null && p.rent_price ? `เช่า ${c.rent_month1_rate_pct}% ของ 1 เดือน` : null,
        ].filter(Boolean).join(" · "),
      }))}
      open={open.filter((o) => !visible.has(o.id)).map((o) => ({ id: o.id, code: o.code, title: o.title, place: o.province, request: o.request }))}
    />
  );
}
