import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { dashboardStats } from "@/server/services/admin";
import { Alert, Card, PageHeader } from "@/components/ui";
import { CATEGORY_LABEL } from "@/lib/constants";
import { formatTHB } from "@/lib/format";
import type { PropertyCategory } from "@/lib/types";

interface Stats {
  users_total: number;
  users_new_7d: number;
  listings_active: number;
  listings_pending: number;
  verifications_pending: number;
  reports_open: number;
  inquiries_7d: number;
  appointments_7d: number;
  offers_7d: number;
  revenue_30d: number;
  deletion_requests_open: number;
  listings_by_category: Partial<Record<PropertyCategory, number>>;
}

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  const s: Stats = await dashboardStats(viewer);

  const queues = s
    ? [
        { label: "ประกาศรอตรวจ", n: s.listings_pending, href: "/admin/listings" },
        { label: "เอกสารรอตรวจ", n: s.verifications_pending, href: "/admin/verifications" },
        { label: "รายงานปัญหาที่เปิดอยู่", n: s.reports_open, href: "/admin/reports" },
        { label: "คำขอลบบัญชี", n: s.deletion_requests_open, href: "/admin/deletions" },
      ]
    : [];
  const kpis = s
    ? [
        { label: "ผู้ใช้ทั้งหมด", value: s.users_total.toLocaleString("th-TH"), sub: `+${s.users_new_7d} ใน 7 วัน` },
        { label: "ประกาศที่เผยแพร่", value: s.listings_active.toLocaleString("th-TH") },
        { label: "ผู้สนใจ / นัดชม / ข้อเสนอ (7 วัน)", value: `${s.inquiries_7d} / ${s.appointments_7d} / ${s.offers_7d}` },
        { label: "รายได้ 30 วัน", value: formatTHB(s.revenue_30d) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="ภาพรวมระบบ" subtitle="Dwelly back office" />
      {sp.denied && <Alert tone="danger">บทบาทของคุณไม่มีสิทธิ์เข้าหน้านั้น</Alert>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {queues.map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className={`p-4 transition-colors hover:border-accent/50 ${q.n > 0 ? "border-warning/40" : ""}`}>
              <p className="text-3xl font-extrabold">{q.n}</p>
              <p className="text-sm text-subtle">{q.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-subtle">{k.label}</p>
            <p className="mt-1 text-2xl font-bold">{k.value}</p>
            {k.sub && <p className="text-xs text-accent">{k.sub}</p>}
          </Card>
        ))}
      </div>

      {s && (
        <Card className="p-5">
          <h2 className="mb-3 font-bold">ประกาศที่เผยแพร่ตามประเภท</h2>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(s.listings_by_category).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).map(([cat, n]) => (
                <tr key={cat} className="border-b border-line last:border-0">
                  <td className="py-2 text-muted">{CATEGORY_LABEL[cat as PropertyCategory] ?? cat}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
