import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { CATEGORY_LABEL } from "@/lib/constants";
import { coverUrl, formatDate } from "@/lib/format";
import { withMedia } from "@/server/services/listings";
import { publicAgentProfile } from "@/server/services/trust";
import { AgentProfileScreen } from "./agent-profile-screen";

type Props = PageProps<"/agents/[code]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const a = await publicAgentProfile(code);
  return a ? { title: `${a.profile.display_name} (${a.agent.agent_code})`, description: a.profile.bio ?? undefined } : { title: "ไม่พบนายหน้า" };
}

/** Public agent profile (design: `vm`, screen "agency-profile"). */
export default async function AgentProfilePage({ params }: Props) {
  const { code } = await params;
  const [a, viewer] = await Promise.all([publicAgentProfile(code), getViewer()]);
  if (!a) notFound();
  const [closed, active] = await Promise.all([withMedia(a.closed), withMedia(a.active)]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dwellyproperty.yaydang.com";
  const deal = (p: (typeof closed)[number]) => ({
    id: p.id, code: p.code, title: p.title, image: coverUrl(p.property_media), place: [CATEGORY_LABEL[p.category], p.district ?? p.province].filter(Boolean).join(" • "),
    price: p.status === "rented" || p.listing_type === "rent" ? Number(p.rent_price ?? 0) : Number(p.sale_price ?? 0), rent: p.status === "rented" || p.listing_type === "rent",
    date: formatDate(p.updated_at),
  });
  return (
    <AgentProfileScreen
      url={`${site}/agents/${a.agent.agent_code}`}
      isSelf={viewer?.id === a.agent.user_id}
      agent={{
        code: a.agent.agent_code, name: a.profile.display_name, english: a.agent.english_name, title: a.agent.title, company: a.agent.company_name,
        avatar: a.profile.avatar_url, bio: a.profile.bio, kyc: a.profile.is_kyc_verified, license: a.agent.license_verified ? a.agent.license_no : null,
        years: a.agent.experience_years, closedDeals: Math.max(a.agent.closed_deals, closed.length), rating: Number(a.agent.rating_avg), ratingCount: a.agent.rating_count,
        zones: a.agent.specialized_zones, categories: a.agent.specialized_categories.map((c) => CATEGORY_LABEL[c as keyof typeof CATEGORY_LABEL] ?? c),
      }}
      closed={closed.map(deal)}
      active={active.map(deal)}
      reviews={a.reviews.map((r) => ({ id: r.id, author: r.reviewer_name, rating: r.rating, body: r.body, date: formatDate(r.created_at) }))}
    />
  );
}
