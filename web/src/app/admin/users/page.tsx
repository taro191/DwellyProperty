import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { Badge, Card, EmptyState, Input, PageHeader, Select, buttonClass } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { AppRole, Profile } from "@/lib/types";

export const metadata: Metadata = { title: "ผู้ใช้" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireStaff(["support", "verifier"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[%_,()]/g, "").slice(0, 80) : "";
  const status = typeof sp.status === "string" && ["active", "suspended", "banned", "deleted"].includes(sp.status) ? sp.status : "";
  const supabase = await createClient();

  // Email lives in profile_private; match it first, then names.
  let ids: string[] | null = null;
  if (q.includes("@")) {
    const { data } = await supabase.from("profile_private").select("user_id").ilike("email", `%${q}%`).limit(50);
    ids = (data ?? []).map((r) => r.user_id);
  }
  let query = supabase.from("profiles").select("*, user_roles(role), profile_private(email, phone)").order("created_at", { ascending: false }).limit(100);
  if (ids) query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  else if (q) query = query.ilike("display_name", `%${q}%`);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  const users = (data ?? []) as (Profile & { user_roles: { role: AppRole }[]; profile_private: { email: string | null; phone: string | null } | null })[];

  return (
    <div>
      <PageHeader title="ผู้ใช้" subtitle="ค้นหาด้วยชื่อหรืออีเมล" />
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
                <p className="truncate text-xs text-subtle">{u.profile_private?.email} · สมัคร {formatDate(u.created_at)}</p>
              </div>
              <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                {u.user_roles.map((r) => <Badge key={r.role}>{ROLE_LABEL[r.role]}</Badge>)}
                {u.is_kyc_verified && <Badge tone="accent">KYC</Badge>}
                {u.status !== "active" && <Badge tone="danger">{u.status}</Badge>}
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
