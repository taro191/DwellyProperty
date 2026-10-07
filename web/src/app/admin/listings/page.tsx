import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { staffListListings } from "@/server/services/listings";
import { Photo } from "@/components/photo";
import { Badge, Card, EmptyState, Input, PageHeader, buttonClass, cn } from "@/components/ui";
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_TONE } from "@/lib/constants";
import { coverUrl, primaryPrice, timeAgo } from "@/lib/format";
import type { PropertyStatus } from "@/lib/types";

export const metadata: Metadata = { title: "ตรวจประกาศ" };

const FILTERS: (PropertyStatus | "all")[] = ["pending_review", "active", "rejected", "expired", "all"];

export default async function AdminListingsPage({ searchParams }: PageProps<"/admin/listings">) {
  const viewer = await requireStaff(["moderator"]);
  const sp = await searchParams;
  const status = (FILTERS.find((f) => f === sp.status) ?? "pending_review") as PropertyStatus | "all";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const rows = await staffListListings(viewer, status, q);

  return (
    <div>
      <PageHeader title="ตรวจประกาศ" subtitle={status === "pending_review" ? "คิวเรียงจากที่รอนานที่สุด" : undefined} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link key={f} href={`/admin/listings?status=${f}`}
            className={cn("rounded-full border px-3 py-1 text-sm", status === f ? "border-accent bg-accent/10 text-accent-strong" : "border-line text-subtle")}>
            {f === "all" ? "ทั้งหมด" : STATUS_LABEL[f]}
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="status" value={status} />
          <Input name="q" defaultValue={q} placeholder="ค้นหาชื่อ หรือรหัส DW…" className="h-9 w-56" />
          <button className={buttonClass("secondary", "sm")}>ค้นหา</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={status === "pending_review" ? "ไม่มีประกาศรอตรวจ 🎉" : "ไม่พบประกาศ"} />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {rows.map((p) => (
            <Link key={p.id} href={`/admin/listings/${p.id}`} className="flex gap-4 px-4 py-3 hover:bg-surface-2">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                <Photo src={coverUrl(p.property_media)} alt="" fill sizes="96px" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  <span className="text-subtle">{p.code} · {CATEGORY_LABEL[p.category]} · {p.province}</span>
                </div>
                <p className="truncate font-semibold">{p.title}</p>
                <p className="text-xs text-subtle">
                  {primaryPrice(p).label} · โดย {p.owner?.display_name}
                  {p.owner?.is_kyc_verified ? " ✓KYC" : ""} · {p.property_media.length} รูป · อัปเดต {timeAgo(p.updated_at)}
                </p>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
