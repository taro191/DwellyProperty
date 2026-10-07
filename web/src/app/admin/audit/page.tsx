import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listAudit } from "@/server/services/admin";
import { Card, EmptyState, Input, PageHeader, buttonClass } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };

const PAGE = 100;

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const viewer = await requireStaff();
  const sp = await searchParams;
  const action = typeof sp.action === "string" ? sp.action.trim().toUpperCase().replace(/[^A-Z_]/g, "") : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const rows = await listAudit(viewer, action, page, PAGE);

  const link = (entityType: string, id: string | null) =>
    !id ? null : entityType === "properties" ? `/admin/listings/${id}` : entityType === "profiles" ? `/admin/users/${id}` : null;

  return (
    <div>
      <PageHeader title="Audit log" subtitle="บันทึกการตัดสินใจของทีมงานและเหตุการณ์สำคัญ (แก้ไขไม่ได้)" />
      <form className="mb-4 flex gap-2">
        <Input name="action" defaultValue={action} placeholder="กรอง action เช่น LISTING, USER_STATUS" className="h-9 w-72" />
        <button className={buttonClass("secondary", "sm")}>กรอง</button>
      </form>
      {rows.length === 0 ? <EmptyState title="ไม่มีรายการ" /> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">เวลา</th>
                <th className="px-4 py-2 font-medium">ผู้ดำเนินการ</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const href = link(r.entity_type, r.entity_id);
                return (
                  <tr key={r.id} className="border-b border-line align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-subtle">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-2">{r.actor_name ?? "system"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                    <td className="px-4 py-2">
                      {href ? <Link href={href} className="text-accent">{r.summary ?? r.entity_id}</Link> : (r.summary ?? `${r.entity_type} ${r.entity_id ?? ""}`)}
                      {r.data && Object.keys(r.data).length > 0 && (
                        <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-[11px] text-subtle">{JSON.stringify(r.data)}</pre>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <div className="mt-4 flex justify-center gap-2">
        {page > 1 && <Link href={`/admin/audit?page=${page - 1}&action=${action}`} className={buttonClass("secondary", "sm")}>ใหม่กว่า</Link>}
        {rows.length === PAGE && <Link href={`/admin/audit?page=${page + 1}&action=${action}`} className={buttonClass("secondary", "sm")}>เก่ากว่า</Link>}
      </div>
    </div>
  );
}
