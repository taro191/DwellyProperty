import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, PageHeader, Textarea, cn } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { Report, ReportStatus } from "@/lib/types";
import { resolveReport } from "../actions";

export const metadata: Metadata = { title: "รายงานปัญหา" };

const FILTERS: ReportStatus[] = ["open", "investigating", "resolved", "dismissed"];

function targetHref(r: Report) {
  if (r.target_type === "property") return `/admin/listings/${r.target_id}`;
  if (r.target_type === "user") return `/admin/users/${r.target_id}`;
  return null;
}

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireStaff(["moderator", "support"]);
  const sp = await searchParams;
  const status = FILTERS.find((f) => f === sp.status);
  const supabase = await createClient();
  let q = supabase.from("reports").select("*, reporter:profiles!reports_reporter_id_fkey(display_name)")
    .order("created_at", { ascending: true }).limit(100);
  q = status ? q.eq("status", status) : q.in("status", ["open", "investigating"]);
  const { data } = await q;
  const rows = (data ?? []) as (Report & { reporter: { display_name: string } | null })[];

  return (
    <div>
      <PageHeader title="รายงานปัญหา" subtitle="ประกาศปลอม มิจฉาชีพ และพฤติกรรมไม่เหมาะสม" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/reports" className={cn("rounded-full border px-3 py-1 text-sm", !status ? "border-accent bg-accent/10 text-accent-strong" : "border-line text-subtle")}>ต้องจัดการ</Link>
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/reports?status=${f}`}
            className={cn("rounded-full border px-3 py-1 text-sm", status === f ? "border-accent bg-accent/10 text-accent-strong" : "border-line text-subtle")}>
            {REPORT_STATUS_LABEL[f]}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState title="ไม่มีรายงานค้าง 🎉" /> : (
        <div className="space-y-3">
          {rows.map((r) => {
            const href = targetHref(r);
            return (
              <Card key={r.id} className="grid gap-4 p-4 md:grid-cols-[1fr_300px]">
                <div className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="danger">{REPORT_REASON_LABEL[r.reason]}</Badge>
                    <Badge>{r.target_type}</Badge>
                    <Badge tone={r.status === "open" ? "warning" : "neutral"}>{REPORT_STATUS_LABEL[r.status]}</Badge>
                  </div>
                  {href ? <Link href={href} className="text-accent underline">เปิดเป้าหมายที่ถูกรายงาน</Link> : <span className="font-mono text-xs text-subtle">{r.target_id}</span>}
                  {r.details && <p className="text-muted">{r.details}</p>}
                  <p className="text-xs text-subtle">โดย {r.reporter?.display_name ?? "—"} · {formatDateTime(r.created_at)}</p>
                  {r.resolution_note && <p className="text-xs text-subtle">ผลการจัดการ: {r.resolution_note}</p>}
                </div>
                {(r.status === "open" || r.status === "investigating") && (
                  <ActionForm action={resolveReport} className="space-y-2">
                    <input type="hidden" name="id" value={r.id} />
                    <Textarea name="note" placeholder="บันทึกการจัดการ (ผู้แจ้งจะเห็น)" className="min-h-16" />
                    <div className="flex flex-wrap gap-2">
                      {r.status === "open" && <SubmitButton name="status" value="investigating" size="sm" variant="secondary">รับเรื่อง</SubmitButton>}
                      <SubmitButton name="status" value="resolved" size="sm">ดำเนินการแล้ว</SubmitButton>
                      <SubmitButton name="status" value="dismissed" size="sm" variant="ghost">ไม่ดำเนินการ</SubmitButton>
                    </div>
                  </ActionForm>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
