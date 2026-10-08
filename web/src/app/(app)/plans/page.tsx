import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { listBoostProducts, listPlans } from "@/server/services/content";
import { listManagedListings } from "@/server/services/listings";
import { PlansScreen } from "./plans-screen";

export const metadata: Metadata = { title: "แพ็กเกจและราคา" };

export default async function PlansPage({ searchParams }: PageProps<"/plans">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const [plans, boosts, mine] = await Promise.all([listPlans(), listBoostProducts(), viewer ? listManagedListings(viewer) : Promise.resolve([])]);
  const role = viewer?.profile.primary_role;
  const asked = sp.for === "owner" || sp.for === "agent" || sp.for === "investor" ? sp.for : null;
  const audience = asked ?? (role === "agent" ? "agent" : role === "investor" ? "investor" : "owner");
  return (
    <PlansScreen
      audience={audience}
      consumer={!asked && !viewer?.staffRole && (role === "buyer" || role === "tenant") ? role : null}
      plans={plans.map((p) => ({ id: p.id, audience: p.audience, name: p.name, badge: p.badge, description: p.description, price: Number(p.price_thb), period: p.period, features: p.features }))}
      boosts={boosts.map((b) => ({ id: b.id, name: b.name, description: b.description, price: Number(b.price_thb), days: b.duration_days }))}
      myListings={mine.filter((p) => p.status === "active" && p.owner_id === viewer?.id).map((p) => ({ id: p.id, title: `${p.code} · ${p.title}` }))}
      signedIn={Boolean(viewer)}
    />
  );
}
