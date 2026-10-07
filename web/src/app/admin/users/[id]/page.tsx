import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasStaffRole, requireStaff } from "@/lib/auth";
import { userDetail } from "@/server/services/admin";
import { Avatar } from "@/components/avatar";
import { Alert, Badge, Card, PageHeader, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { REPORT_REASON_LABEL, ROLE_LABEL, STATUS_LABEL, STATUS_TONE, VERIFICATION_KIND_LABEL, VERIFICATION_STATUS_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { setUserStatus } from "../../actions";

export const metadata: Metadata = { title: "ข้อมูลผู้ใช้" };

export default async function AdminUserDetail({ params }: PageProps<"/admin/users/[id]">) {
  const viewer = await requireStaff(["support", "verifier"]);
  const { id } = await params;
  const u = await userDetail(viewer, id);
  if (!u) notFound();
  const { listings, reports, verifications, staff } = u;
  const priv = { email: u.email, phone: u.phone, line_id: u.line_id };
  const canModerate = hasStaffRole(viewer, ["support"]) && id !== viewer.id;

  return (
    <div className="space-y-6">
      <PageHeader title={u.display_name} subtitle={<span className="font-mono text-xs">{u.id}</span>} />
      {u.status !== "active" && <Alert tone="danger">บัญชีสถานะ <b>{u.status}</b>{u.status_reason && ` — ${u.status_reason}`}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center gap-4 p-5">
            <Avatar name={u.display_name} src={u.avatar_url} size={56} />
            <div className="space-y-1 text-sm">
              <p>{priv?.email ?? "—"} · {priv?.phone ?? "ไม่มีเบอร์"} {priv?.line_id && `· LINE ${priv.line_id}`}</p>
              <p className="text-subtle">สมัคร {formatDateTime(u.created_at)}</p>
              <div className="flex flex-wrap gap-1">
                {u.roles.map((r) => <Badge key={r}>{ROLE_LABEL[r]}</Badge>)}
                {u.is_kyc_verified && <Badge tone="accent">KYC ✓</Badge>}
                {staff?.active && <Badge tone="info">Staff · {staff.role}</Badge>}
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 font-bold">ประกาศ ({listings.length})</h2>
            {listings.map((l) => (
              <Link key={l.id} href={`/admin/listings/${l.id}`} className="flex items-center justify-between gap-2 border-b border-line py-2 text-sm last:border-0 hover:text-accent">
                <span className="truncate">{l.code} · {l.title}</span>
                <Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
              </Link>
            ))}
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 font-bold">การยืนยันเอกสาร</h2>
            {verifications.length === 0 ? <p className="text-sm text-subtle">ยังไม่เคยยื่น</p> : verifications.map((v) => (
              <p key={v.id} className="flex justify-between border-b border-line py-2 text-sm last:border-0">
                <span>{VERIFICATION_KIND_LABEL[v.kind]} · {formatDate(v.submitted_at)}</span>
                <Badge>{VERIFICATION_STATUS_LABEL[v.status]}</Badge>
              </p>
            ))}
          </Card>
          {reports.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-2 font-bold text-red-300">ถูกรายงาน ({reports.length})</h2>
              {reports.map((r) => (
                <p key={r.id} className="border-b border-line py-2 text-sm last:border-0">
                  <Badge tone="danger">{REPORT_REASON_LABEL[r.reason]}</Badge> {r.details} <span className="text-xs text-subtle">· {r.status}</span>
                </p>
              ))}
            </Card>
          )}
        </div>

        {canModerate && u.status !== "deleted" && (
          <Card className="space-y-3 p-5">
            <h2 className="font-bold">จัดการบัญชี</h2>
            <ActionForm action={setUserStatus} className="space-y-2">
              <input type="hidden" name="id" value={u.id} />
              <Textarea name="reason" placeholder="เหตุผล (บันทึกใน audit log)" className="min-h-20" />
              <div className="flex flex-wrap gap-2">
                {u.status !== "active" && <SubmitButton name="status" value="active" size="sm">คืนสถานะปกติ</SubmitButton>}
                {u.status !== "suspended" && <SubmitButton name="status" value="suspended" size="sm" variant="secondary">ระงับชั่วคราว</SubmitButton>}
                {u.status !== "banned" && <SubmitButton name="status" value="banned" size="sm" variant="danger">แบน (ซ่อนประกาศทั้งหมด)</SubmitButton>}
              </div>
            </ActionForm>
          </Card>
        )}
      </div>
    </div>
  );
}
