import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { listStaff } from "@/server/services/admin";
import { Badge, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { STAFF_ROLE_LABEL } from "@/lib/constants";
import type { StaffRole } from "@/lib/types";
import { setStaff } from "../actions";

export const metadata: Metadata = { title: "ทีมงาน" };

const ROLE_HELP: Record<StaffRole, string> = {
  super_admin: "ทุกสิทธิ์ รวมถึงจัดการทีมงาน",
  moderator: "ตรวจ/ระงับประกาศ, Hubs, รายงาน, Co-Agent",
  verifier: "ตรวจ KYC, โฉนด, ใบอนุญาต, Pods",
  support: "ดูแลผู้ใช้, ระงับ/แบน, รายงาน, ลบบัญชี",
  finance: "แพ็กเกจ, คำสั่งซื้อ, ใบกำกับภาษี",
};

export default async function StaffPage() {
  const viewer = await requireStaff(["super_admin"]);
  const staff = (await listStaff(viewer)).map((x) => ({ ...x.s, name: x.name }));
  const roles = Object.keys(STAFF_ROLE_LABEL) as StaffRole[];

  return (
    <div className="space-y-6">
      <PageHeader title="ทีมงาน" subtitle="กำหนดบทบาทและสิทธิ์ของทีมงานหลังบ้าน" />
      <Card className="divide-y divide-line">
        {staff.map((s) => (
          <div key={s.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <Link href={`/admin/users/${s.user_id}`} className="font-semibold text-accent">{s.name}</Link>
              {!s.active && <Badge className="ml-2" tone="danger">ปิดใช้งาน</Badge>}
            </div>
            {s.user_id === viewer.id ? (
              <Badge tone="info">{STAFF_ROLE_LABEL[s.role as StaffRole]} (คุณ)</Badge>
            ) : (
              <ActionForm action={setStaff} className="flex gap-2" showMessage={false}>
                <input type="hidden" name="user_id" value={s.user_id} />
                <Select name="role" defaultValue={s.role} className="h-9 w-40">
                  {roles.map((r) => <option key={r} value={r}>{STAFF_ROLE_LABEL[r]}</option>)}
                </Select>
                <SubmitButton name="active" value="true" size="sm" variant="secondary">บันทึก</SubmitButton>
                {s.active && <SubmitButton name="active" value="false" size="sm" variant="ghost">ปิดใช้งาน</SubmitButton>}
              </ActionForm>
            )}
          </div>
        ))}
      </Card>
      <Card className="p-5">
        <p className="mb-3 font-semibold">เพิ่มทีมงาน</p>
        <ActionForm action={setStaff} className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end" resetOnSuccess>
          <Field label="อีเมลของผู้ใช้ (ต้องสมัครสมาชิกแล้ว)"><Input name="email" type="email" required /><FieldError name="email" /></Field>
          <Field label="บทบาท">
            <Select name="role" defaultValue="moderator">{roles.map((r) => <option key={r} value={r}>{STAFF_ROLE_LABEL[r]}</option>)}</Select>
          </Field>
          <SubmitButton>เพิ่ม</SubmitButton>
        </ActionForm>
        <ul className="mt-4 space-y-1 text-xs text-subtle">
          {roles.map((r) => <li key={r}><b className="text-muted">{STAFF_ROLE_LABEL[r]}</b> — {ROLE_HELP[r]}</li>)}
        </ul>
      </Card>
    </div>
  );
}
