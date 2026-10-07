import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { daysSince, formatDateTime } from "@/lib/format";
import { processDeletion } from "../actions";

export const metadata: Metadata = { title: "คำขอลบบัญชี" };

export default async function AdminDeletionsPage() {
  await requireStaff(["support"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("account_deletion_requests")
    .select("*, user:profiles!account_deletion_requests_user_id_fkey(id, display_name)")
    .order("requested_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="คำขอลบบัญชี (PDPA)" subtitle="ต้องดำเนินการภายใน 30 วันนับจากวันที่ขอ" />
      <Alert tone="warning">
        การดำเนินการจะลบ/ปกปิดข้อมูลส่วนบุคคลทันทีและย้อนกลับไม่ได้ ข้อมูลธุรกรรมที่กฎหมายกำหนด (คำสั่งซื้อ ใบกำกับภาษี) ยังคงเก็บไว้
      </Alert>
      {rows.length === 0 ? <EmptyState title="ไม่มีคำขอ" /> : (
        <Card className="divide-y divide-line">
          {rows.map((r) => {
            const user = r.user as { id: string; display_name: string } | null;
            const days = daysSince(r.requested_at);
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <Link href={`/admin/users/${user?.id}`} className="font-semibold text-accent">{user?.display_name}</Link>
                  <Badge className="ml-2" tone={r.status === "pending" ? (days > 20 ? "danger" : "warning") : "neutral"}>{r.status}</Badge>
                  <p className="text-xs text-subtle">ขอเมื่อ {formatDateTime(r.requested_at)} ({days} วันที่แล้ว){r.reason && ` · ${r.reason}`}</p>
                </div>
                {(r.status === "pending" || r.status === "processing") && (
                  <ActionForm action={processDeletion}>
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton size="sm" variant="danger" pendingText="กำลังลบข้อมูล…">ดำเนินการลบ</SubmitButton>
                  </ActionForm>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
