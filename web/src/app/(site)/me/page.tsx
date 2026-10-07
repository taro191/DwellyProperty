import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { ROLE_LABEL } from "@/lib/constants";
import { AvatarUploader } from "./avatar-uploader";
import { saveProfile } from "./actions";

export const metadata: Metadata = { title: "ตั้งค่าบัญชี" };

export default async function MePage() {
  const viewer = await requireViewer("/me");
  const supabase = await createClient();
  const { data: priv } = await supabase.from("profile_private").select("*").eq("user_id", viewer.id).single();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="ตั้งค่าบัญชี" subtitle={viewer.email ?? undefined} />
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <AvatarUploader userId={viewer.id} name={viewer.profile.display_name} src={viewer.profile.avatar_url} />
        <div className="flex flex-wrap gap-1.5">
          {viewer.roles.map((r) => <Badge key={r} tone={r === viewer.profile.primary_role ? "accent" : "neutral"}>{ROLE_LABEL[r]}</Badge>)}
          {viewer.profile.is_kyc_verified && <Badge tone="accent">ยืนยันตัวตนแล้ว</Badge>}
          {viewer.staffRole && <Badge tone="info">Staff · {viewer.staffRole}</Badge>}
        </div>
      </Card>
      <Card className="p-5">
        <ActionForm action={saveProfile} className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อที่แสดง" required className="sm:col-span-2">
            <Input name="display_name" defaultValue={viewer.profile.display_name} required />
            <FieldError name="display_name" />
          </Field>
          <Field label="เบอร์โทรศัพท์" hint="แสดงเฉพาะเมื่อผู้ใช้ที่ล็อกอินกด “ดูเบอร์โทร” บนประกาศของคุณ">
            <Input name="phone" type="tel" defaultValue={priv?.phone ?? ""} />
            <FieldError name="phone" />
          </Field>
          <Field label="LINE ID"><Input name="line_id" defaultValue={priv?.line_id ?? ""} /></Field>
          <Field label="แนะนำตัว" className="sm:col-span-2">
            <Textarea name="bio" defaultValue={viewer.profile.bio ?? ""} maxLength={2000} />
          </Field>
          <div className="sm:col-span-2"><SubmitButton>บันทึก</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
