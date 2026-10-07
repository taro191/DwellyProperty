import type { Metadata } from "next";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { formatTHB } from "@/lib/format";
import type { Plan } from "@/lib/types";

export const metadata: Metadata = { title: "แพ็กเกจและราคา" };

const AUDIENCE = { owner: "เจ้าของทรัพย์", agent: "นายหน้า & บริษัทนายหน้า", investor: "นักลงทุน" } as const;

export default async function PlansPage() {
  const supabase = await createClient();
  const [{ data: plans }, { data: boosts }] = await Promise.all([
    supabase.from("plans").select("*").eq("active", true).order("sort_order"),
    supabase.from("boost_products").select("*").eq("active", true).order("sort_order"),
  ]);
  const byAudience = (a: Plan["audience"]) => ((plans ?? []) as Plan[]).filter((p) => p.audience === a);

  return (
    <div className="space-y-10">
      <PageHeader title="แพ็กเกจและราคา" subtitle="เริ่มต้นฟรี อัปเกรดเมื่อพร้อม ราคารวม VAT แล้ว" />
      <Alert tone="info">ระบบชำระเงินออนไลน์กำลังจะเปิดให้บริการ สนใจแพ็กเกจติดต่อทีมงานผ่าน LINE @dwelly</Alert>

      {(Object.keys(AUDIENCE) as Plan["audience"][]).map((a) => (
        <section key={a}>
          <h2 className="mb-4 text-xl font-extrabold">{AUDIENCE[a]}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {byAudience(a).map((p) => (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-lg font-bold">{p.name}</p>
                  {p.badge && <Badge tone="accent">{p.badge}</Badge>}
                </div>
                <p className="mt-2 text-3xl font-extrabold text-accent-strong">
                  {p.price_thb === 0 ? "ฟรี" : formatTHB(p.price_thb)}
                  {p.price_thb > 0 && <span className="text-sm font-medium text-subtle"> /{p.period === "year" ? "ปี" : "เดือน"}</span>}
                </p>
                {p.description && <p className="mt-2 text-sm text-subtle">{p.description}</p>}
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{f}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {(boosts?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-extrabold">ดันประกาศ (Boost)</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {boosts!.map((b) => (
              <Card key={b.id} className="p-5">
                <p className="font-bold">{b.name}</p>
                <p className="mt-1 text-2xl font-extrabold text-accent-strong">{formatTHB(b.price_thb)}</p>
                <p className="mt-2 text-sm text-subtle">{b.description}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
