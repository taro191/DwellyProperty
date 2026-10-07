import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Photo } from "@/components/photo";
import { Alert, Badge, Card, Input, PageHeader, Textarea, buttonClass } from "@/components/ui";
import { ReasonPicker } from "../../reason-picker";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { CATEGORY_LABEL, LISTING_TYPE_LABEL, REPORT_REASON_LABEL, STATUS_LABEL, STATUS_TONE } from "@/lib/constants";
import { areaLabel, formatDate, formatDateTime, formatTHB, mediaUrl } from "@/lib/format";
import type { Property, PropertyMedia, ReportReason } from "@/lib/types";
import { featureListing, reviewListing, takedownListing } from "../../actions";

export const metadata: Metadata = { title: "ตรวจประกาศ" };

const REJECT_TEMPLATES = [
  "รูปภาพไม่ชัดเจนหรือไม่ใช่รูปทรัพย์จริง กรุณาอัปโหลดรูปใหม่",
  "ราคาหรือขนาดพื้นที่ไม่สมเหตุสมผล กรุณาตรวจสอบข้อมูล",
  "มีเบอร์โทร/ลิงก์ภายนอกในรูปหรือคำอธิบาย กรุณาลบออก",
  "ข้อมูลที่ตั้งไม่ครบหรือไม่ตรงกับแผนที่",
  "ประกาศซ้ำกับประกาศที่มีอยู่แล้ว",
];

export default async function AdminListingDetail({ params }: PageProps<"/admin/listings/[id]">) {
  await requireStaff(["moderator"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("properties").select("*, property_media(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Property & { property_media: PropertyMedia[] };

  const [{ data: owner }, { data: ownerPrivate }, { count: ownerListings }, { data: reports }, { data: history }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, is_kyc_verified, status, created_at").eq("id", p.owner_id).single(),
    supabase.from("profile_private").select("email, phone").eq("user_id", p.owner_id).maybeSingle(),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("owner_id", p.owner_id),
    supabase.from("reports").select("id, reason, details, status, created_at").eq("target_type", "property").eq("target_id", id).order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("action, summary, data, created_at").eq("entity_type", "properties").eq("entity_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const media = [...p.property_media].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.title}
        subtitle={<span className="flex flex-wrap items-center gap-2"><Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>{p.code}</span>}
        actions={<Link href={`/property/${p.code}`} target="_blank" className={buttonClass("secondary", "sm")}>ดูหน้าประกาศ ↗</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {media.length === 0 && <Alert tone="danger">ไม่มีรูปภาพ</Alert>}
            {media.map((m) => (
              <a key={m.id} href={mediaUrl(m)} target="_blank" rel="noreferrer" className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
                <Photo src={mediaUrl(m)} alt="" fill sizes="33vw" />
              </a>
            ))}
          </div>
          <Card className="p-5">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {[
                ["ประเภท", `${LISTING_TYPE_LABEL[p.listing_type]} · ${CATEGORY_LABEL[p.category]}`],
                ["ราคาขาย", formatTHB(p.sale_price)],
                ["ค่าเช่า", p.rent_price ? `${formatTHB(p.rent_price)}/เดือน` : "-"],
                ["พื้นที่", areaLabel(p) ?? "-"],
                ["ห้องนอน/น้ำ", p.bedrooms != null ? `${p.bedrooms}/${p.bathrooms ?? "-"}` : "-"],
                ["ที่ตั้ง", [p.address_line, p.subdistrict, p.district, p.province].filter(Boolean).join(", ")],
                ["พิกัด", p.lat != null ? `${p.lat}, ${p.lng}` : "ไม่ได้ปักหมุด"],
                ["สร้างเมื่อ", formatDateTime(p.created_at)],
                ["หมดอายุ", formatDate(p.expires_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
                  <dt className="text-subtle">{k}</dt><dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {p.description && <p className="mt-4 whitespace-pre-line text-sm text-muted">{p.description}</p>}
          </Card>
          {(reports?.length ?? 0) > 0 && (
            <Card className="p-5">
              <h2 className="mb-2 font-bold text-red-300">รายงานจากผู้ใช้ ({reports!.length})</h2>
              {reports!.map((r) => (
                <p key={r.id} className="border-b border-line py-2 text-sm last:border-0">
                  <Badge tone="danger">{REPORT_REASON_LABEL[r.reason as ReportReason]}</Badge> {r.details} <span className="text-xs text-subtle">· {r.status}</span>
                </p>
              ))}
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-5 text-sm">
            <h2 className="mb-2 font-bold">ผู้ลงประกาศ</h2>
            <Link href={`/admin/users/${owner?.id}`} className="font-semibold text-accent">{owner?.display_name}</Link>
            <p className="text-subtle">{ownerPrivate?.email} · {ownerPrivate?.phone ?? "ไม่มีเบอร์"}</p>
            <p className="text-subtle">สมัคร {formatDate(owner?.created_at)} · {ownerListings} ประกาศ</p>
            <div className="mt-2 flex gap-1">
              {owner?.is_kyc_verified ? <Badge tone="accent">KYC ✓</Badge> : <Badge>ยังไม่ KYC</Badge>}
              {owner?.status !== "active" && <Badge tone="danger">{owner?.status}</Badge>}
            </div>
          </Card>

          {p.status === "pending_review" && (
            <Card className="space-y-3 p-5">
              <h2 className="font-bold">ผลการตรวจ</h2>
              <ActionForm action={reviewListing}>
                <input type="hidden" name="id" value={p.id} />
                <SubmitButton name="decision" value="approve" className="w-full">✓ อนุมัติและเผยแพร่</SubmitButton>
              </ActionForm>
              <ActionForm action={reviewListing} className="space-y-2">
                <input type="hidden" name="id" value={p.id} />
                <ReasonPicker templates={REJECT_TEMPLATES} placeholder="เหตุผลที่ไม่อนุมัติ (ผู้ลงประกาศจะเห็น)" />
                <SubmitButton name="decision" value="reject" variant="danger" className="w-full">ไม่อนุมัติ / ส่งกลับแก้ไข</SubmitButton>
              </ActionForm>
            </Card>
          )}

          {(p.status === "active" || p.status === "reserved") && (
            <>
              <Card className="space-y-2 p-5">
                <h2 className="font-bold">ทรัพย์แนะนำ</h2>
                <p className="text-xs text-subtle">{p.featured_until ? `แนะนำถึง ${formatDateTime(p.featured_until)}` : "ยังไม่ได้ตั้งเป็นทรัพย์แนะนำ"}</p>
                <ActionForm action={featureListing} className="flex gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <Input name="days" type="number" min={0} max={365} defaultValue={7} className="w-24" aria-label="จำนวนวัน" />
                  <SubmitButton size="md" variant="secondary">ตั้งค่า (0 = ยกเลิก)</SubmitButton>
                </ActionForm>
              </Card>
              <Card className="space-y-2 border-danger/40 p-5">
                <h2 className="font-bold text-red-300">ระงับประกาศ</h2>
                <ActionForm action={takedownListing} className="space-y-2">
                  <input type="hidden" name="id" value={p.id} />
                  <Textarea name="reason" required placeholder="เหตุผล (ผู้ลงประกาศจะเห็น)" className="min-h-20" />
                  <SubmitButton variant="danger" size="sm">ระงับประกาศ</SubmitButton>
                </ActionForm>
              </Card>
            </>
          )}

          {(history?.length ?? 0) > 0 && (
            <Card className="p-5 text-sm">
              <h2 className="mb-2 font-bold">ประวัติ</h2>
              {history!.map((h, i) => (
                <p key={i} className="border-b border-line py-1.5 last:border-0">
                  <span className="font-mono text-xs">{h.action}</span> · <span className="text-xs text-subtle">{formatDateTime(h.created_at)}</span>
                  {(h.data as { reason?: string })?.reason && <span className="block text-xs text-muted">{(h.data as { reason?: string }).reason}</span>}
                </p>
              ))}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
