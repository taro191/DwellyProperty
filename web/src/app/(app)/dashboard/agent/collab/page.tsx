import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { CATEGORY_LABEL } from "@/lib/constants";
import { formatDate, formatTHB, timeAgo } from "@/lib/format";
import { getAgentProfile } from "@/server/services/trust";
import { agentAssignments } from "@/server/services/collab";
import { AgentCollabScreen } from "./agent-collab-screen";

export const metadata: Metadata = { title: "ศูนย์เชื่อมโยงเจ้าของทรัพย์" };

export default async function AgentCollabPage() {
  const viewer = await requireViewer("/dashboard/agent/collab");
  const profile = await getAgentProfile(viewer.id);
  const jobs = profile ? await agentAssignments(viewer) : [];
  return (
    <AgentCollabScreen
      isAgent={Boolean(profile)}
      jobs={jobs.map(({ assignment: a, property: p, owner_name, owner_avatar, owner_phone, owner_line, logs, viewings, locks }) => ({
        id: a.id, propertyId: p.id, code: p.code, name: p.title, type: CATEGORY_LABEL[p.category], location: [p.district, p.province].filter(Boolean).join(", "),
        price: a.deal === "rent" ? `${formatTHB(p.rent_price)}/เดือน` : formatTHB(p.sale_price), deal: a.deal, contract: a.contract, commission: a.commission,
        ownerName: owner_name, ownerAvatar: owner_avatar, ownerPhone: owner_phone, ownerLine: owner_line,
        notice: logs.find((l) => l.kind === "owner_notice")?.summary ?? null, viewings, locks,
        logs: logs.filter((l) => l.kind !== "owner_notice" && l.author_id === viewer.id).map((l) => ({
          id: l.id, kind: l.kind, client: l.client_name, phone4: l.client_phone_last4, notes: l.summary, when: timeAgo(l.created_at), date: formatDate(l.created_at),
        })),
      }))}
    />
  );
}
