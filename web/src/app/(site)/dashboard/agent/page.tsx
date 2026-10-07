import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getZones } from "@/lib/queries";
import { Alert, Badge, Card, Field, Input, PageHeader, Select, Textarea, buttonClass } from "@/components/ui";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { CATEGORY_LABEL } from "@/lib/constants";
import { formatTHB } from "@/lib/format";
import { createPod, requestPartnerAccess, saveAgentProfile } from "./actions";

export const metadata: Metadata = { title: "นายหน้า & Co-Agent" };

export default async function AgentPage() {
  const viewer = await requireViewer("/dashboard/agent");
  const supabase = await createClient();
  const [{ data: profile }, { data: access }, { data: pods }, { data: programs }, zones] = await Promise.all([
    supabase.from("agent_profiles").select("*").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("commission_access_requests").select("status, property_id, created_at").eq("agent_id", viewer.id).is("property_id", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("pod_members").select("role, agency_pods(id, code, name, status, trust_score)").eq("user_id", viewer.id),
    // RLS only returns programmes this agent may see (approved access or own listings)
    supabase.from("commission_programs").select("*, properties(title, code, listing_type, sale_price, rent_price, status, owner_id)")
      .eq("enabled", true).limit(50),
    getZones(),
  ]);

  const coAgent = (programs ?? []).filter((c) => {
    const p = c.properties as { owner_id: string; status: string } | null;
    return p && p.owner_id !== viewer.id && p.status === "active";
  });

  return (
    <div className="space-y-6">
      <PageHeader title="นายหน้า & Co-Agent" subtitle="สร้างโปรไฟล์นายหน้า ขอสิทธิ์ Dwelly Commission และจัดการ Agency Pod" />

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">โปรไฟล์นายหน้า</h2>
          {profile?.license_verified ? (
            <Badge tone="accent"><ShieldCheck className="h-3 w-3" /> ใบอนุญาตยืนยันแล้ว</Badge>
          ) : (
            <Link href="/me/verification?kind=agent_license" className="text-sm text-accent underline">ยืนยันใบอนุญาตนายหน้า</Link>
          )}
        </div>
        <ActionForm action={saveAgentProfile} className="grid gap-3 sm:grid-cols-2">
          <Field label="ชื่อภาษาอังกฤษ"><Input name="english_name" defaultValue={profile?.english_name ?? ""} /></Field>
          <Field label="ตำแหน่ง"><Input name="title" defaultValue={profile?.title ?? ""} placeholder="เช่น Senior Agent" /></Field>
          <Field label="บริษัท / สังกัด"><Input name="company_name" defaultValue={profile?.company_name ?? ""} /></Field>
          <Field label="เลขที่ใบอนุญาต / สมาชิกสมาคม"><Input name="license_no" defaultValue={profile?.license_no ?? ""} /></Field>
          <Field label="ประสบการณ์ (ปี)"><Input name="experience_years" type="number" min={0} max={70} defaultValue={profile?.experience_years ?? ""} /></Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-xs font-semibold text-muted">ประเภททรัพย์ที่ถนัด</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm">
                  <input type="checkbox" name="specialized_categories[]" value={k} defaultChecked={profile?.specialized_categories?.includes(k)} className="accent-emerald-500" />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2"><SubmitButton size="sm">{profile ? "บันทึกโปรไฟล์" : "สร้างโปรไฟล์นายหน้า"}</SubmitButton></div>
        </ActionForm>
      </Card>

      {profile && (
        <Card className="space-y-3 p-5">
          <h2 className="font-bold">Dwelly Commission Partner</h2>
          <p className="text-sm text-subtle">ได้รับสิทธิ์แล้วจะเห็นทรัพย์ที่เจ้าของเปิดรับ Co-Agent พร้อมอัตราค่าคอมมิชชั่น</p>
          {access?.status === "approved" ? (
            <Alert tone="accent">คุณเป็น Partner แล้ว ✓</Alert>
          ) : access?.status === "pending" ? (
            <Alert tone="warning">คำขออยู่ระหว่างตรวจสอบ</Alert>
          ) : (
            <ActionForm action={requestPartnerAccess} className="space-y-2">
              {access?.status === "rejected" && <Alert tone="danger">คำขอก่อนหน้าไม่ผ่าน สามารถส่งใหม่ได้</Alert>}
              <Textarea name="message" placeholder="แนะนำตัว ประสบการณ์ ทำเลที่ดูแล" className="min-h-20" />
              <SubmitButton size="sm">ขอสิทธิ์ Partner</SubmitButton>
            </ActionForm>
          )}
          {coAgent.length > 0 && (
            <div className="divide-y divide-line rounded-2xl border border-line">
              {coAgent.map((c) => {
                const p = c.properties as { title: string; code: string; listing_type: string; sale_price: number | null; rent_price: number | null };
                return (
                  <Link key={c.property_id} href={`/property/${p.code}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-surface-2">
                    <span className="min-w-0 truncate">{p.title}</span>
                    <span className="text-accent-strong">
                      {c.sale_rate_pct != null && p.sale_price && `ขาย ${c.sale_rate_pct}% (${formatTHB((p.sale_price * c.sale_rate_pct) / 100)})`}
                      {c.rent_month1_rate_pct != null && p.rent_price && ` · เช่า ${c.rent_month1_rate_pct}% ของ 1 เดือน`}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {profile && (
        <Card className="space-y-3 p-5">
          <h2 className="font-bold">Agency Pod</h2>
          {(pods ?? []).length > 0 ? (
            (pods ?? []).map((m) => {
              const pod = m.agency_pods as unknown as { id: string; code: string; name: string; status: string; trust_score: number };
              return (
                <div key={pod.id} className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm">
                  <span><b>{pod.name}</b> · {pod.code} {m.role === "leader" && <Badge>หัวหน้า</Badge>}</span>
                  <Badge tone={pod.status === "verified" ? "accent" : "warning"}>{pod.status === "verified" ? `Verified · ${pod.trust_score}` : "รอตรวจสอบ"}</Badge>
                </div>
              );
            })
          ) : (
            <ActionForm action={createPod} className="grid gap-3 sm:grid-cols-2">
              <Field label="ชื่อ Pod" required><Input name="name" required /><FieldError name="name" /></Field>
              <Field label="โซนที่ดูแล">
                <Select name="zone_id" defaultValue="">
                  <option value="">ไม่ระบุ</option>
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name_th}</option>)}
                </Select>
              </Field>
              <Field label="รายละเอียด" className="sm:col-span-2"><Textarea name="description" className="min-h-20" /></Field>
              <div className="sm:col-span-2"><SubmitButton size="sm">สร้าง Pod</SubmitButton></div>
            </ActionForm>
          )}
          <Link href="/plans" className={buttonClass("ghost", "sm")}>ดูแพ็กเกจสำหรับนายหน้า →</Link>
        </Card>
      )}
    </div>
  );
}
