import type { Metadata } from "next";
import Link from "next/link";
import { List, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { PAGE_SIZE, parseFilters } from "@/lib/queries";
import { favoriteIds, searchListings } from "@/server/services/listings";
import { listZones } from "@/server/services/content";
import { PropertyGrid } from "@/components/property-card";
import { ListingsMap, type MapPoint } from "@/components/map";
import { EmptyState, Input, Select, buttonClass, cn } from "@/components/ui";
import { CATEGORY_LABEL, PROVINCES } from "@/lib/constants";
import { primaryPrice } from "@/lib/format";

export const metadata: Metadata = { title: "ค้นหาอสังหาริมทรัพย์" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const view = sp.view === "map" ? "map" : "list";
  const viewer = await getViewer();

  const [{ items, total }, zones, favorites] = await Promise.all([
    searchListings(filters, view === "map" ? { limit: 300, mapOnly: true } : {}),
    listZones(),
    favoriteIds(viewer?.id),
  ]);

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) p.set(k, v);
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/search?${p.toString()}`;
  };
  const pages = Math.ceil(total / PAGE_SIZE);
  const points: MapPoint[] = items
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({ id: p.id, code: p.code, title: p.title, lat: p.lat!, lng: p.lng!, priceLabel: primaryPrice(p).label }));

  return (
    <div className="flex flex-col gap-4">
      <form action="/search" className="flex gap-2">
        {view === "map" && <input type="hidden" name="view" value="map" />}
        <Input name="q" defaultValue={filters.q} placeholder="ค้นหาทำเล / โครงการ / รหัสประกาศ" aria-label="คำค้น" className="flex-1" />
        <button className={buttonClass("primary", "md")}>ค้นหา</button>
      </form>
      <details className="group rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-extrabold text-[var(--text-primary)]">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4 text-[var(--accent)]" /> ตัวกรองเพิ่มเติม
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] group-open:hidden">แตะเพื่อเปิด</span>
        </summary>
        <form action="/search" className="space-y-3 border-t border-[var(--border)] p-4">
          <input type="hidden" name="q" value={filters.q ?? ""} />
          {view === "map" && <input type="hidden" name="view" value="map" />}
          <div className="grid grid-cols-2 gap-2">
            <Select name="type" defaultValue={filters.type ?? ""} aria-label="ซื้อหรือเช่า">
              <option value="">ซื้อ/เช่า</option>
              <option value="sale">ซื้อ</option>
              <option value="rent">เช่า</option>
            </Select>
            <Select name="category" defaultValue={filters.category ?? ""} aria-label="ประเภท">
              <option value="">ทุกประเภท</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <Select name="province" defaultValue={filters.province ?? ""} aria-label="จังหวัด">
            <option value="">ทุกจังหวัด</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select name="zone" defaultValue={filters.zone ?? ""} aria-label="โซน">
            <option value="">ทุกโซน</option>
            {zones.map((z) => <option key={z.slug} value={z.slug}>{z.icon} {z.name_th}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input name="min" type="number" min={0} step={1000} defaultValue={filters.min} placeholder="ราคาต่ำสุด" aria-label="ราคาต่ำสุด" />
            <Input name="max" type="number" min={0} step={1000} defaultValue={filters.max} placeholder="ราคาสูงสุด" aria-label="ราคาสูงสุด" />
          </div>
          <Select name="beds" defaultValue={filters.beds?.toString() ?? ""} aria-label="ห้องนอน">
            <option value="">ห้องนอน: ไม่ระบุ</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ ห้องนอน</option>)}
          </Select>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <input type="checkbox" name="verified" value="1" defaultChecked={filters.verified} className="accent-[var(--accent)]" /> เฉพาะที่ตรวจสอบแล้ว
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <input type="checkbox" name="pets" value="1" defaultChecked={filters.pets} className="accent-[var(--accent)]" /> เลี้ยงสัตว์ได้
          </label>
          <Select name="sort" defaultValue={filters.sort} aria-label="เรียงลำดับ">
            <option value="recommended">แนะนำ</option>
            <option value="newest">ล่าสุด</option>
            <option value="price_asc">ราคา ต่ำ → สูง</option>
            <option value="price_desc">ราคา สูง → ต่ำ</option>
          </Select>
          <button className={buttonClass("primary", "md", "w-full")}>ใช้ตัวกรอง</button>
          <Link href={view === "map" ? "/search?view=map" : "/search"} className="block text-center text-xs text-[var(--text-secondary)] hover:text-white">
            ล้างตัวกรอง
          </Link>
        </form>
      </details>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-[var(--text-secondary)]">พบ <b className="text-[var(--text-primary)]">{total.toLocaleString("th-TH")}</b> รายการ</p>
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-1">
            <Link href={qs({ view: undefined })} className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold", view === "list" ? "bg-[var(--accent)] text-[var(--bg)]" : "text-[var(--text-secondary)]")}>
              <List className="h-3.5 w-3.5" /> รายการ
            </Link>
            <Link href={qs({ view: "map", page: undefined })} className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold", view === "map" ? "bg-[var(--accent)] text-[var(--bg)]" : "text-[var(--text-secondary)]")}>
              <MapIcon className="h-3.5 w-3.5" /> แผนที่
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState title="ไม่พบทรัพย์ที่ตรงกับเงื่อนไข" body="ลองปรับตัวกรองหรือขยายช่วงราคา" />
        ) : view === "map" ? (
          <div className="h-[65vh] overflow-hidden rounded-3xl border border-[var(--border)]">
            <ListingsMap points={points} className="h-full w-full" />
          </div>
        ) : (
          <>
            <PropertyGrid items={items} favorites={favorites} signedIn={Boolean(viewer)} />
            {pages > 1 && (
              <nav className="mt-6 flex items-center justify-center gap-2" aria-label="หน้า">
                {(filters.page ?? 1) > 1 && (
                  <Link href={qs({ page: String((filters.page ?? 1) - 1) })} className={buttonClass("secondary", "sm")}>ก่อนหน้า</Link>
                )}
                <span className="text-xs text-[var(--text-secondary)]">หน้า {filters.page} / {pages}</span>
                {(filters.page ?? 1) < pages && (
                  <Link href={qs({ page: String((filters.page ?? 1) + 1) })} className={buttonClass("secondary", "sm")}>ถัดไป</Link>
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
