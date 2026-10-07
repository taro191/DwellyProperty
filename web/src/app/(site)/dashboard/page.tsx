import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Heart, Home, MessageSquare, Plus } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { INTENT_LABEL } from "@/lib/constants";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "ศูนย์ผู้ขาย" };

export default async function DashboardPage() {
  const viewer = await requireViewer("/dashboard");
  const supabase = await createClient();

  const [{ data: listings }, { count: newLeads }, { count: pendingAppts }, { count: pendingOffers }, { data: recentLeads }] =
    await Promise.all([
      supabase.from("properties").select("id, status, views_count, saves_count, inquiries_count").or(`owner_id.eq.${viewer.id},agent_id.eq.${viewer.id}`),
      supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("seller_id", viewer.id).eq("status", "new"),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("seller_id", viewer.id).eq("status", "pending"),
      supabase.from("offers").select("id", { count: "exact", head: true }).eq("seller_id", viewer.id).eq("status", "pending"),
      supabase.from("inquiries").select("id, intent, message, created_at, properties(title, code), profiles!inquiries_buyer_id_fkey(display_name)")
        .eq("seller_id", viewer.id).order("created_at", { ascending: false }).limit(5),
    ]);

  const all = listings ?? [];
  const active = all.filter((l) => l.status === "active").length;
  const sum = (k: "views_count" | "saves_count" | "inquiries_count") => all.reduce((n, l) => n + (l[k] ?? 0), 0);

  const stats = [
    { label: "ประกาศที่เผยแพร่", value: `${active}/${all.length}`, icon: Home, href: "/dashboard/listings" },
    { label: "ยอดเข้าชมรวม", value: sum("views_count").toLocaleString("th-TH"), icon: Eye },
    { label: "ถูกบันทึก", value: sum("saves_count").toLocaleString("th-TH"), icon: Heart },
    { label: "ผู้สนใจทั้งหมด", value: sum("inquiries_count").toLocaleString("th-TH"), icon: MessageSquare, href: "/dashboard/leads" },
  ];
  const todo = [
    { n: newLeads ?? 0, label: "ผู้สนใจใหม่ที่ยังไม่ได้ติดต่อ", href: "/dashboard/leads" },
    { n: pendingAppts ?? 0, label: "คำขอนัดชมที่รอยืนยัน", href: "/dashboard/appointments" },
    { n: pendingOffers ?? 0, label: "ข้อเสนอที่รอตอบ", href: "/dashboard/offers" },
  ].filter((t) => t.n > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`สวัสดี ${viewer.profile.display_name}`}
        subtitle="จัดการประกาศ ผู้สนใจ นัดหมาย และข้อเสนอได้ที่นี่"
        actions={<ButtonLink href="/dashboard/listings/new"><Plus className="h-4 w-4" /> ลงประกาศใหม่</ButtonLink>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => {
          const body = (
            <Card className="p-4">
              <Icon className="h-5 w-5 text-accent" />
              <p className="mt-3 text-2xl font-extrabold">{value}</p>
              <p className="text-xs text-subtle">{label}</p>
            </Card>
          );
          return href ? <Link key={label} href={href}>{body}</Link> : <div key={label}>{body}</div>;
        })}
      </div>

      {todo.length > 0 && (
        <Card className="divide-y divide-line">
          {todo.map((t) => (
            <Link key={t.href} href={t.href} className="flex items-center justify-between px-5 py-4 hover:bg-surface-2">
              <span className="text-sm">{t.label}</span>
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-[#04130d]">{t.n}</span>
            </Link>
          ))}
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">ผู้สนใจล่าสุด</h2>
        {(recentLeads?.length ?? 0) === 0 ? (
          <EmptyState title="ยังไม่มีผู้สนใจ" body="เมื่อมีคนส่งข้อความถึงประกาศของคุณ จะแสดงที่นี่" />
        ) : (
          <Card className="divide-y divide-line">
            {recentLeads!.map((l) => {
              const prop = l.properties as unknown as { title: string; code: string } | null;
              const buyer = l.profiles as unknown as { display_name: string } | null;
              return (
                <Link key={l.id} href="/dashboard/leads" className="block px-5 py-4 hover:bg-surface-2">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-semibold">{buyer?.display_name} · <span className="text-accent">{INTENT_LABEL[l.intent as keyof typeof INTENT_LABEL]}</span></span>
                    <span className="shrink-0 text-xs text-subtle">{timeAgo(l.created_at)}</span>
                  </div>
                  <p className="truncate text-xs text-subtle">{prop?.title}</p>
                  {l.message && <p className="mt-1 line-clamp-2 text-sm text-muted">{l.message}</p>}
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
