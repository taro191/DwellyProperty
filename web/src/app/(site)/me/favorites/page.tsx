import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LISTING_SELECT } from "@/lib/queries";
import { PropertyGrid } from "@/components/property-card";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import type { PropertyWithMedia } from "@/lib/types";

export const metadata: Metadata = { title: "ทรัพย์ที่บันทึกไว้" };

export default async function FavoritesPage() {
  const viewer = await requireViewer("/me/favorites");
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select(`created_at, properties(${LISTING_SELECT})`)
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false });
  const items = (data ?? []).map((f) => f.properties as unknown as PropertyWithMedia).filter(Boolean);

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
