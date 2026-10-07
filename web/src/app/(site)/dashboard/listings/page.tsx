import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Heart, MessageSquare, Plus } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { listManagedListings } from "@/server/services/listings";
import { Photo } from "@/components/photo";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/constants";
import { coverUrl, formatDate, primaryPrice } from "@/lib/format";

export const metadata: Metadata = { title: "ประกาศของฉัน" };

export default async function MyListingsPage() {
  const viewer = await requireViewer("/dashboard/listings");
  const listings = await listManagedListings(viewer);

  return (
    <div>
      <PageHeader
        title="ประกาศของฉัน"
        subtitle={`${listings.length} รายการ`}
        actions={<ButtonLink href="/dashboard/listings/new"><Plus className="h-4 w-4" /> ลงประกาศใหม่</ButtonLink>}
      />
      {listings.length === 0 ? (
        <EmptyState
          title="ยังไม่มีประกาศ"
          body="ลงประกาศฟรี ทีมงานตรวจสอบและเผยแพร่ภายใน 24 ชั่วโมง"
          action={<ButtonLink href="/dashboard/listings/new">ลงประกาศแรก</ButtonLink>}
        />
      ) : (
        <div className="space-y-3">
          {listings.map((p) => (
            <Link key={p.id} href={`/dashboard/listings/${p.id}`}>
              <Card className="flex gap-4 p-3 transition-colors hover:border-accent/50">
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-2xl">
                  <Photo src={coverUrl(p.property_media)} alt="" fill sizes="128px" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    {p.is_verified && <Badge tone="accent">ตรวจสอบแล้ว</Badge>}
                    {p.owner_id !== viewer.id && <Badge tone="info">ดูแลในฐานะนายหน้า</Badge>}
                    <span className="text-xs text-subtle">{p.code}</span>
                  </div>
                  <p className="truncate font-semibold">{p.title}</p>
                  <p className="text-sm text-accent-strong">{primaryPrice(p).label}{primaryPrice(p).suffix}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-subtle">
                    <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{p.views_count}</span>
                    <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{p.saves_count}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{p.inquiries_count}</span>
                    {p.expires_at && p.status === "active" && <span>หมดอายุ {formatDate(p.expires_at)}</span>}
                  </div>
                  {p.status === "rejected" && p.rejection_reason && (
                    <p className="text-xs text-red-300">เหตุผล: {p.rejection_reason}</p>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
