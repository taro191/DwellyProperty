import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { toListingView } from "@/lib/listing-view";
import { listManagedListings } from "@/server/services/listings";
import { agentDirectory, ownerCollab } from "@/server/services/collab";
import { CollabScreen, type HubProperty } from "./collab-screen";

export const metadata: Metadata = { title: "ศูนย์บริหารนายหน้า (Owner-Agent Hub)" };

export default async function CollabPage({ searchParams }: PageProps<"/dashboard/collab">) {
  const viewer = await requireViewer("/dashboard/collab");
  const sp = await searchParams;
  const mine = (await listManagedListings(viewer)).filter((p) => p.owner_id === viewer.id && p.status !== "archived");
  if (mine.length === 0) {
    return (
      <div className="min-h-dvh pb-24 bg-[var(--bg)] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-3">
          <Users className="w-10 h-10 text-[var(--text-secondary)] mx-auto" />
          <p className="font-bold text-sm text-[var(--text-primary)]">ศูนย์นี้สำหรับเจ้าของทรัพย์ที่มีประกาศของตัวเอง</p>
          <Link href="/dashboard/listings/new" className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)]">
            ลงประกาศแรกของคุณ
          </Link>
        </div>
      </div>
    );
  }
  const properties: HubProperty[] = mine.map((p) => {
    const v = toListingView(p);
    return {
      id: p.id, code: p.code, name: p.title, location: v.location, price: v.price, isLand: p.category === "land", verified: p.is_verified,
      deals: p.listing_type === "sale" ? ["sale"] : p.listing_type === "rent" ? ["rent"] : ["sale", "rent"],
    };
  });
  const current = properties.find((p) => p.id === sp.p) ?? properties[0];
  const [{ agents, logs }, directory] = await Promise.all([ownerCollab(viewer, current.id), agentDirectory()]);
  return (
    <CollabScreen
      key={current.id}
      properties={properties}
      current={current}
      agents={agents.map((a) => ({
        id: a.id, agentId: a.agent_id, deal: a.deal, name: a.name, avatar: a.avatar, phone: a.phone, code: a.agent_code, company: a.company,
        contract: a.contract, commission: a.commission, viewings: a.viewings, locks: a.locks, lastNote: a.last?.summary ?? null, lastWhen: a.last ? timeAgo(a.last.created_at) : null,
      }))}
      logs={logs.map((l) => ({
        id: l.id, deal: l.deal, kind: l.kind, author: l.author_id === viewer.id ? "เจ้าของทรัพย์ (คุณ)" : l.author_name, avatar: l.author_avatar, when: timeAgo(l.created_at),
        client: l.client_name ? `${l.client_name}${l.client_phone_last4 ? ` (xxx-${l.client_phone_last4})` : ""}` : null,
        amount: l.amount != null ? Number(l.amount) : null, interest: l.interest, summary: l.summary,
      }))}
      directory={directory.filter((d) => d.id !== viewer.id).map((d) => ({ id: d.id, name: d.name, code: d.agent_code, company: d.company, closed: d.closed_deals }))}
    />
  );
}
