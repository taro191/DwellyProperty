import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { staffPartnerRequests } from "@/server/services/trust";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { formatDateTime } from "@/lib/format";
import { decidePartner } from "../actions";

export const metadata: Metadata = { title: "Co-Agent Partner" };

export default async function AdminCommissionPage() {
  const viewer = await requireStaff(["moderator"]);
  const rows = await staffPartnerRequests(viewer);

  return (
    <div>
      <PageHeader title="Dwelly Commission Partner" subtitle="นายหน้าที่ขอสิทธิ์เห็นทรัพย์ Co-Agent ทั้งแพลตฟอร์ม — ควรอนุมัติเฉพาะผู้ที่ยืนยันใบอนุญาตแล้ว" />
      {rows.length === 0 ? <EmptyState title="ไม่มีคำขอ" /> : (
        <Card className="divide-y divide-line">
          {rows.map((r) => {
            const agent = r.agent;
            const ap = r.agent_profile;
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <Link href={`/admin/users/${agent.id}`} className="font-semibold text-accent">{agent.display_name}</Link>
                  <span className="ml-2 inline-flex gap-1">
                    {agent.is_kyc_verified && <Badge tone="accent">KYC</Badge>}
                    {ap?.license_verified ? <Badge tone="accent">ใบอนุญาต ✓</Badge> : <Badge tone="warning">ใบอนุญาตยังไม่ยืนยัน</Badge>}
                  </span>
                  <p className="text-xs text-subtle">{ap?.company_name ?? "-"} · {ap?.license_no ?? "-"} · {formatDateTime(r.created_at)}</p>
                  {r.message && <p className="mt-1 text-muted">{r.message}</p>}
                </div>
                <ActionForm action={decidePartner} className="flex gap-2" showMessage={false}>
                  <input type="hidden" name="id" value={r.id} />
                  {r.status === "pending" ? (
                    <>
                      <SubmitButton name="status" value="approved" size="sm">อนุมัติ</SubmitButton>
                      <SubmitButton name="status" value="rejected" size="sm" variant="ghost">ปฏิเสธ</SubmitButton>
                    </>
                  ) : (
                    <SubmitButton name="status" value="revoked" size="sm" variant="danger">ยกเลิกสิทธิ์</SubmitButton>
                  )}
                </ActionForm>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
