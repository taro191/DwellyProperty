import type { Metadata } from "next";
import Link from "next/link";
import { hasStaffRole, requireStaff } from "@/lib/auth";
import { CreateUserForm } from "./create-user-form";
import { searchUsers } from "@/server/services/admin";
import { Avatar } from "@/components/avatar";
import { Badge, Card, EmptyState, Input, PageHeader, Select, buttonClass } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "ผู้ใช้" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const viewer = await requireStaff(["support", "verifier"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[%_,()]/g, "").slice(0, 80) : "";
  const status = typeof sp.status === "string" && ["active", "suspended", "banned", "deleted"].includes(sp.status) ? sp.status : "";
  const users = await searchUsers(viewer, q, status);

  return (
    <div>
      <PageHeader title="ผู้ใช้" subtitle="ค้นหาด้วยชื่อหรืออีเมล" />
      {hasStaffRole(viewer, ["super_admin"]) && <CreateUserForm />}
      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="ชื่อ หรือ อีเมล" className="h-9 w-64" />
        <Select name="status" defaultValue={status} className="h-9 w-40">
          <option value="">ทุกสถานะ</option>
          <option value="active">ปกติ</option>
          <option value="suspended">ระงับชั่วคราว</option>
          <option value="banned">แบน</option>
          <option value="deleted">ลบบัญชีแล้ว</option>
        </Select>
        <button className={buttonClass("secondary", "sm")}>ค้นหา</button>
      </form>
      {users.length === 0 ? <EmptyState title="ไม่พบผู้ใช้" /> : (
        <Card className="divide-y divide-line overflow-hidden">
          {users.map((u) => (
            <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
              <Avatar name={u.display_name} src={u.avatar_url} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.display_name}</p>
                <p className="truncate text-xs text-subtle">{u.email} · สมัคร {formatDate(u.created_at)}</p>
              </div>
              <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                {u.roles.map((r) => <Badge key={r}>{ROLE_LABEL[r]}</Badge>)}
                {u.is_kyc_verified && <Badge tone="accent">KYC</Badge>}
                {u.status !== "active" && <Badge tone="danger">{u.status}</Badge>}
                {u.login_disabled && <Badge tone="danger">ปิดล็อกอิน</Badge>}
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
