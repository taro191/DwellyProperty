import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { listHubs, listZones } from "@/server/services/content";
import { Badge, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { formatDate } from "@/lib/format";
import { createHub, setHubStatus, toggleZone } from "../actions";

export const metadata: Metadata = { title: "Hubs & Zones" };

const HUB_STATUS = ["draft", "scheduled", "live", "ended"] as const;

export default async function AdminContentPage() {
  await requireStaff(["moderator"]);
  const [hubs, zones] = await Promise.all([listHubs(["draft", "scheduled", "live", "ended"]), listZones(true)]);

  return (
    <div className="space-y-8">
      <PageHeader title="Hubs & Zones" subtitle="แคมเปญรวมทรัพย์ และโซนสำหรับกรองบนหน้าแรก" />

      <section className="space-y-3">
        <h2 className="font-bold">Dwelly Hubs</h2>
        {hubs.map((h) => (
          <Card key={h.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-semibold">{h.name} <Badge>{h.status}</Badge></p>
              <p className="text-xs text-subtle">/{h.slug} · {formatDate(h.starts_at)} – {formatDate(h.ends_at)} · {h.property_count} ทรัพย์</p>
            </div>
            <ActionForm action={setHubStatus} className="flex gap-1" showMessage={false}>
              <input type="hidden" name="id" value={h.id} />
              {HUB_STATUS.filter((s) => s !== h.status).map((s) => (
                <SubmitButton key={s} name="status" value={s} size="sm" variant="ghost">{s}</SubmitButton>
              ))}
            </ActionForm>
          </Card>
        ))}
        <Card className="p-5">
          <p className="mb-3 font-semibold">สร้าง Hub ใหม่</p>
          <ActionForm action={createHub} className="grid gap-3 sm:grid-cols-2" resetOnSuccess>
            <Field label="ชื่อ" required><Input name="name" required /><FieldError name="name" /></Field>
            <Field label="slug (URL)" required><Input name="slug" required placeholder="salaya-2027" /><FieldError name="slug" /></Field>
            <Field label="วันเริ่ม" required><Input name="starts_at" type="date" required /></Field>
            <Field label="วันสิ้นสุด" required><Input name="ends_at" type="date" required /></Field>
            <Field label="ดึงทรัพย์จากโซน" hint="เพิ่มประกาศที่เผยแพร่ในโซนนี้เข้า Hub อัตโนมัติ">
              <Select name="zone_id" defaultValue="">
                <option value="">ไม่ดึงอัตโนมัติ</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name_th}</option>)}
              </Select>
            </Field>
            <Field label="สถานะ">
              <Select name="status" defaultValue="scheduled">{HUB_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
            </Field>
            <Field label="รายละเอียด" className="sm:col-span-2"><Textarea name="description" className="min-h-20" /></Field>
            <div className="sm:col-span-2"><SubmitButton size="sm">สร้าง Hub</SubmitButton></div>
          </ActionForm>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Zones</h2>
        <Card className="divide-y divide-line">
          {zones.map((z) => (
            <div key={z.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>{z.icon} {z.name_th} <span className="text-xs text-subtle">/{z.slug}</span></span>
              <ActionForm action={toggleZone} showMessage={false}>
                <input type="hidden" name="id" value={z.id} />
                <input type="hidden" name="active" value={z.active ? "false" : "true"} />
                <SubmitButton size="sm" variant={z.active ? "ghost" : "secondary"}>{z.active ? "ซ่อน" : "แสดง"}</SubmitButton>
              </ActionForm>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
