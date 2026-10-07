import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { listFavorites } from "@/server/services/listings";
import { PropertyGrid } from "@/components/property-card";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "ทรัพย์ที่บันทึกไว้" };

export default async function FavoritesPage() {
  const viewer = await requireViewer("/me/favorites");
  const items = await listFavorites(viewer);

  return (
    <div>
      <PageHeader title="ทรัพย์ที่บันทึกไว้" subtitle={`${items.length} รายการ`} />
      {items.length === 0 ? (
        <EmptyState title="ยังไม่ได้บันทึกทรัพย์" body="กดรูปหัวใจบนประกาศเพื่อเก็บไว้ดูภายหลัง" action={<ButtonLink href="/search">ค้นหาทรัพย์</ButtonLink>} />
      ) : (
        <PropertyGrid items={items} favorites={new Set(items.map((i) => i.id))} signedIn />
      )}
    </div>
  );
}
