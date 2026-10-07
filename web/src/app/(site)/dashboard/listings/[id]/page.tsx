import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getZones } from "@/lib/queries";
import { Alert, Badge, Card, Field, Input, PageHeader, Textarea, buttonClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { STATUS_LABEL, STATUS_TONE, VERIFICATION_STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Property, PropertyMedia } from "@/lib/types";
import { ListingForm } from "../listing-form";
import { MediaManager } from "../media-manager";
import { StatusActions } from "./status-actions";
import { decideCommissionAccess, saveCommission, updateListing } from "../actions";

export const metadata: Metadata = { title: "จัดการประกาศ" };

export default async function EditListingPage({ params, searchParams }: PageProps<"/dashboard/listings/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const viewer = await requireViewer(`/dashboard/listings/${id}`);
  const supabase = await createClient();

  const { data: property } = await supabase.from("properties").select("*, property_media(*)").eq("id", id).maybeSingle();
  if (!property || (property.owner_id !== viewer.id && property.agent_id !== viewer.id)) notFound();
  const p = property as Property & { property_media: PropertyMedia[] };
  const isOwner = p.owner_id === viewer.id;

  const [zones, { data: commission }, { data: accessRequests }, { data: ownership }] = await Promise.all([
    getZones(),
    supabase.from("commission_programs").select("*").eq("property_id", id).maybeSingle(),
    isOwner
      ? supabase.from("commission_access_requests").select("id, status, message, created_at, profiles!commission_access_requests_agent_id_fkey(display_name)")
          .eq("property_id", id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("verification_requests").select("status, reviewer_note").eq("property_id", id).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={p.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
            <span>{p.code}</span>
            {p.expires_at && p.status === "active" && <span>· หมดอายุ {formatDate(p.expires_at)}</span>}
          </span>
        }
        actions={
          <Link href={`/property/${p.code}`} className={buttonClass("secondary", "sm")} target="_blank">
            ดูหน้าประกาศ <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {sp.created && <Alert tone="accent">สร้างแบบร่างแล้ว ✓ เพิ่มรูปด้านล่าง แล้วกด “ส่งให้ทีมงานตรวจสอบ”</Alert>}
      {p.status === "rejected" && p.rejection_reason && (
        <Alert tone="danger"><b>ไม่ผ่านการตรวจสอบ:</b> {p.rejection_reason} — แก้ไขแล้วส่งตรวจอีกครั้งได้</Alert>
      )}
      {p.status === "pending_review" && <Alert tone="warning">อยู่ระหว่างตรวจสอบโดยทีมงาน ปกติไม่เกิน 24 ชั่วโมง</Alert>}

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold">สถานะประกาศ</p>
        <StatusActions id={p.id} status={p.status} isOwner={isOwner} />
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <div><p className="text-xl font-bold">{p.views_count}</p><p className="text-xs text-subtle">เข้าชม</p></div>
          <div><p className="text-xl font-bold">{p.saves_count}</p><p className="text-xs text-subtle">บันทึก</p></div>
          <div><p className="text-xl font-bold">{p.inquiries_count}</p><p className="text-xs text-subtle">ผู้สนใจ</p></div>
        </div>
      </Card>

      <Card className="p-5" id="photos">
        <p className="mb-3 text-base font-bold">รูปภาพ</p>
        <MediaManager propertyId={p.id} userId={viewer.id} media={p.property_media} />
      </Card>

      {isOwner && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-accent" /> ป้าย “ตรวจสอบกรรมสิทธิ์แล้ว”</p>
            <p className="text-sm text-subtle">
              {p.is_verified
                ? "ประกาศนี้ได้รับการยืนยันกรรมสิทธิ์แล้ว"
                : ownership
                  ? `สถานะคำขอ: ${VERIFICATION_STATUS_LABEL[ownership.status as keyof typeof VERIFICATION_STATUS_LABEL]}${ownership.reviewer_note ? ` — ${ownership.reviewer_note}` : ""}`
                  : "ส่งสำเนาโฉนด/สัญญาซื้อขาย เพื่อเพิ่มความน่าเชื่อถือ ประกาศที่ยืนยันแล้วได้รับการติดต่อมากกว่า"}
            </p>
          </div>
          {!p.is_verified && (!ownership || ownership.status === "rejected") && (
            <Link href={`/me/verification?kind=property_ownership&property=${p.id}`} className={buttonClass("secondary", "sm")}>ยื่นเอกสาร</Link>
          )}
        </Card>
      )}

      <ListingForm action={updateListing} zones={zones} initial={p} submitLabel="บันทึกการแก้ไข" />

      {isOwner && (
        <Card className="space-y-4 p-5">
          <div>
            <p className="font-bold">Dwelly Commission (Co-Agent)</p>
            <p className="text-sm text-subtle">ให้นายหน้าที่ได้รับอนุญาตช่วยหาผู้ซื้อ/ผู้เช่า ข้อมูลส่วนนี้ผู้ซื้อและผู้เช่าจะไม่เห็น</p>
          </div>
          <ActionForm action={saveCommission} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="property_id" value={p.id} />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="enabled" defaultChecked={commission?.enabled ?? true} className="accent-emerald-500" /> เปิดรับ Co-Agent
            </label>
            {p.listing_type !== "rent" && (
              <Field label="ค่าคอมมิชชั่นการขาย (% ของราคาขาย)">
                <Input name="sale_rate_pct" type="number" step="0.1" min={0} max={10} defaultValue={commission?.sale_rate_pct ?? 3} />
              </Field>
            )}
            {p.listing_type !== "sale" && (
              <>
                <Field label="ค่าเช่าเดือนแรก (% ของค่าเช่า 1 เดือน)">
                  <Input name="rent_month1_rate_pct" type="number" min={0} max={300} defaultValue={commission?.rent_month1_rate_pct ?? 100} />
                </Field>
                <Field label="สัญญาต่ออายุ (% ของค่าเช่า 1 เดือน)">
                  <Input name="renewal_rate_pct" type="number" min={0} max={300} defaultValue={commission?.renewal_rate_pct ?? 25} />
                </Field>
              </>
            )}
            <Field label="เงื่อนไขเพิ่มเติม" className="sm:col-span-2">
              <Textarea name="terms" defaultValue={commission?.terms ?? ""} className="min-h-20" />
            </Field>
            <div className="sm:col-span-2"><SubmitButton size="sm">บันทึกเงื่อนไข</SubmitButton></div>
          </ActionForm>

          {(accessRequests?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">นายหน้าที่ขอเข้าร่วม</p>
              {accessRequests!.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{(r.profiles as unknown as { display_name: string } | null)?.display_name}</p>
                    {r.message && <p className="text-xs text-subtle">{r.message}</p>}
                  </div>
                  {r.status === "pending" ? (
                    <ActionForm action={decideCommissionAccess} className="flex gap-2" showMessage={false}>
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton name="status" value="approved" size="sm">อนุมัติ</SubmitButton>
                      <SubmitButton name="status" value="rejected" size="sm" variant="ghost">ปฏิเสธ</SubmitButton>
                    </ActionForm>
                  ) : r.status === "approved" ? (
                    <ActionForm action={decideCommissionAccess} showMessage={false}>
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton name="status" value="revoked" size="sm" variant="ghost">ยกเลิกสิทธิ์</SubmitButton>
                    </ActionForm>
                  ) : (
                    <Badge>{r.status}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
