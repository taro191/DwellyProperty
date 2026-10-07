import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { BedDouble, Bath, Building, Compass, Eye, Heart, Layers, MapPin, Maximize2, ShieldCheck, Sofa, Wallet } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LISTING_SELECT } from "@/lib/queries";
import { Avatar } from "@/components/avatar";
import { Gallery } from "@/components/gallery";
import { FavoriteButton } from "@/components/favorite-button";
import { PropertyGrid } from "@/components/property-card";
import { SingleLocationMap } from "@/components/map";
import { Alert, Badge, Card } from "@/components/ui";
import { CATEGORY_LABEL, DIRECTION_LABEL, FURNISHING_LABEL, LISTING_TYPE_LABEL, STATUS_LABEL } from "@/lib/constants";
import { areaLabel, coverUrl, formatDate, formatTHB, mediaUrl } from "@/lib/format";
import type { Profile, PropertyWithMedia } from "@/lib/types";
import { PropertyActions } from "./property-actions";
import { ViewTracker } from "./view-tracker";
import { ReportButton } from "@/components/report-button";

const getProperty = cache(async (code: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(`${LISTING_SELECT}, zones(slug, name_th, icon), agency_pods(code, name, trust_score, status)`)
    .eq("code", code.toUpperCase())
    .maybeSingle();
  return data as (PropertyWithMedia & {
    zones: { slug: string; name_th: string; icon: string | null } | null;
    agency_pods: { code: string; name: string; trust_score: number; status: string } | null;
  }) | null;
});

export async function generateMetadata({ params }: PageProps<"/property/[code]">): Promise<Metadata> {
  const { code } = await params;
  const p = await getProperty(code);
  if (!p) return { title: "ไม่พบประกาศ" };
  const cover = coverUrl(p.property_media);
  const price = p.listing_type === "rent" ? `${formatTHB(p.rent_price)}/เดือน` : formatTHB(p.sale_price);
  const description = `${CATEGORY_LABEL[p.category]} ${LISTING_TYPE_LABEL[p.listing_type]} ${price} · ${[p.district, p.province].filter(Boolean).join(", ")}`;
  return {
    title: p.title,
    description,
    alternates: { canonical: `/property/${p.code}` },
    openGraph: { title: p.title, description, images: cover ? [{ url: cover }] : undefined },
    robots: p.status === "active" ? undefined : { index: false },
  };
}

export default async function PropertyPage({ params }: PageProps<"/property/[code]">) {
  const { code } = await params;
  const p = await getProperty(code);
  if (!p) notFound();

  const viewer = await getViewer();
  const supabase = await createClient();
  const contactId = p.agent_id ?? p.owner_id;
  const isMine = viewer && (viewer.id === p.owner_id || viewer.id === p.agent_id);

  const [{ data: contact }, { data: agent }, { data: fav }, { data: similar }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url, is_kyc_verified, created_at").eq("id", contactId).maybeSingle(),
    p.agent_id
      ? supabase.from("agent_profiles").select("title, company_name, license_verified, rating_avg, rating_count, closed_deals").eq("user_id", p.agent_id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewer
      ? supabase.from("favorites").select("property_id").eq("user_id", viewer.id).eq("property_id", p.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("properties").select(LISTING_SELECT).eq("status", "active").eq("category", p.category)
      .eq("province", p.province).neq("id", p.id).limit(3),
  ]);

  const images = [...p.property_media].filter((m) => m.kind !== "video").sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({ src: mediaUrl(m), alt: m.caption ?? p.title }));
  const area = areaLabel(p);
  const ld = p.land_details ?? {};

  const facts = [
    p.category !== "land" && p.bedrooms != null && { icon: BedDouble, label: "ห้องนอน", value: p.bedrooms === 0 ? "สตูดิโอ" : p.bedrooms },
    p.category !== "land" && p.bathrooms != null && { icon: Bath, label: "ห้องน้ำ", value: p.bathrooms },
    area && { icon: Maximize2, label: p.category === "land" ? "ขนาดที่ดิน" : "พื้นที่ใช้สอย", value: area },
    p.floor != null && { icon: Layers, label: "ชั้น", value: p.total_floors ? `${p.floor}/${p.total_floors}` : p.floor },
    p.direction && { icon: Compass, label: "ทิศ", value: DIRECTION_LABEL[p.direction] ?? p.direction },
    p.furnishing && { icon: Sofa, label: "เฟอร์นิเจอร์", value: FURNISHING_LABEL[p.furnishing] },
    p.maintenance_fee != null && { icon: Wallet, label: "ค่าส่วนกลาง", value: `${formatTHB(p.maintenance_fee)}/เดือน` },
    p.project_name && { icon: Building, label: "โครงการ", value: p.project_name },
  ].filter(Boolean) as { icon: typeof BedDouble; label: string; value: string | number }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    url: `/property/${p.code}`,
    datePosted: p.published_at,
    image: images.map((i) => i.src),
    offers: {
      "@type": "Offer",
      priceCurrency: "THB",
      price: p.listing_type === "rent" ? p.rent_price : p.sale_price,
    },
  };

  return (
    <article className="space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ViewTracker propertyId={p.id} />

      {isMine && p.status !== "active" && (
        <Alert tone={p.status === "rejected" ? "danger" : "warning"}>
          สถานะประกาศ: <b>{STATUS_LABEL[p.status]}</b>
          {p.rejection_reason && <> — {p.rejection_reason}</>} ·{" "}
          <Link href={`/dashboard/listings/${p.id}`} className="underline">จัดการประกาศ</Link>
        </Alert>
      )}

      <Gallery images={images} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{LISTING_TYPE_LABEL[p.listing_type]}</Badge>
              <Badge>{CATEGORY_LABEL[p.category]}</Badge>
              {p.is_verified && <Badge tone="accent"><ShieldCheck className="h-3 w-3" /> ตรวจสอบกรรมสิทธิ์แล้ว</Badge>}
              {p.status !== "active" && <Badge tone="info">{STATUS_LABEL[p.status]}</Badge>}
              <span className="ml-auto text-xs text-subtle">รหัส {p.code}</span>
            </div>
            <h1 className="text-2xl font-extrabold leading-snug sm:text-3xl">{p.title}</h1>
            <p className="flex items-center gap-1 text-sm text-muted">
              <MapPin className="h-4 w-4" /> {[p.address_line, p.subdistrict, p.district, p.province].filter(Boolean).join(", ")}
            </p>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
              {p.sale_price != null && p.listing_type !== "rent" && (
                <p className="text-3xl font-extrabold text-accent-strong">{formatTHB(p.sale_price)}</p>
              )}
              {p.rent_price != null && p.listing_type !== "sale" && (
                <p className="text-xl font-bold text-accent-strong">{formatTHB(p.rent_price)}<span className="text-sm text-subtle"> /เดือน</span></p>
              )}
              {p.category === "land" && ld.price_per_sqwa && (
                <p className="text-sm text-subtle">({formatTHB(ld.price_per_sqwa)} / ตร.ว.)</p>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-subtle">
              <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {p.views_count} ครั้ง</span>
              <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {p.saves_count} บันทึก</span>
              {p.published_at && <span>ลงประกาศ {formatDate(p.published_at)}</span>}
            </div>
          </header>

          {facts.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <Card key={label} className="p-3">
                  <Icon className="h-4 w-4 text-accent" />
                  <p className="mt-2 text-xs text-subtle">{label}</p>
                  <p className="text-sm font-semibold">{value}</p>
                </Card>
              ))}
            </div>
          )}

          {p.description && (
            <section>
              <h2 className="mb-2 text-lg font-bold">รายละเอียด</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-muted">{p.description}</p>
            </section>
          )}

          {p.category === "land" && Object.keys(ld).length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">ข้อมูลที่ดิน</h2>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {[
                  ["เอกสารสิทธิ์", ld.deed_type],
                  ["ผังเมือง", ld.zoning],
                  ["หน้ากว้างติดถนน", ld.road_frontage_m && `${ld.road_frontage_m} ม.`],
                  ["ถนน", ld.road_type],
                  ["รูปแปลง", ld.shape],
                  ["สาธารณูปโภค", ld.utilities?.join(", ")],
                  ["เหมาะสำหรับ", ld.suitable_for?.join(", ")],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-4 border-b border-line py-2">
                    <dt className="text-subtle">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {p.listing_type !== "sale" && (p.deposit_months != null || p.min_lease_months != null || p.pets_allowed != null) && (
            <section>
              <h2 className="mb-3 text-lg font-bold">เงื่อนไขการเช่า</h2>
              <div className="flex flex-wrap gap-2 text-sm">
                {p.deposit_months != null && <Badge>เงินประกัน {p.deposit_months} เดือน</Badge>}
                {p.advance_months != null && <Badge>จ่ายล่วงหน้า {p.advance_months} เดือน</Badge>}
                {p.min_lease_months != null && <Badge>สัญญาขั้นต่ำ {p.min_lease_months} เดือน</Badge>}
                {p.pets_allowed != null && <Badge tone={p.pets_allowed ? "accent" : "neutral"}>{p.pets_allowed ? "เลี้ยงสัตว์ได้" : "ไม่อนุญาตสัตว์เลี้ยง"}</Badge>}
              </div>
            </section>
          )}

          {(p.amenities.length > 0 || p.tags.length > 0) && (
            <section>
              <h2 className="mb-3 text-lg font-bold">สิ่งอำนวยความสะดวก</h2>
              <div className="flex flex-wrap gap-2">
                {[...p.amenities, ...p.tags].map((t) => <Badge key={t}>{t}</Badge>)}
              </div>
            </section>
          )}

          {p.lat != null && p.lng != null && (
            <section>
              <h2 className="mb-3 text-lg font-bold">ทำเลที่ตั้ง</h2>
              <div className="h-72 overflow-hidden rounded-3xl border border-line">
                <SingleLocationMap lat={p.lat} lng={p.lng} exact={p.show_exact_location} />
              </div>
              {!p.show_exact_location && <p className="mt-2 text-xs text-subtle">แสดงตำแหน่งโดยประมาณ ผู้ขายจะแจ้งที่อยู่จริงเมื่อนัดชม</p>}
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={contact?.display_name ?? "ผู้ขาย"} src={contact?.avatar_url} size={48} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{contact?.display_name ?? "ผู้ขาย"}</p>
                <p className="text-xs text-subtle">
                  {p.agent_id ? (agent?.title ?? "นายหน้า") : "เจ้าของทรัพย์"}
                  {agent?.company_name && ` · ${agent.company_name}`}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(contact as Pick<Profile, "is_kyc_verified"> | null)?.is_kyc_verified && <Badge tone="accent">ยืนยันตัวตนแล้ว</Badge>}
                  {agent?.license_verified && <Badge tone="accent">ใบอนุญาตนายหน้า</Badge>}
                  {agent && agent.rating_count > 0 && <Badge>★ {Number(agent.rating_avg).toFixed(2)} ({agent.rating_count})</Badge>}
                </div>
              </div>
              <div className="ml-auto">
                <FavoriteButton propertyId={p.id} initial={Boolean(fav)} signedIn={Boolean(viewer)} />
              </div>
            </div>
            {p.agency_pods?.status === "verified" && (
              <p className="mt-3 rounded-2xl bg-accent/10 px-3 py-2 text-xs text-accent-strong">
                🛡️ ดูแลโดย {p.agency_pods.name} · Trust score {p.agency_pods.trust_score}
              </p>
            )}
            <div className="mt-4">
              {isMine ? (
                <Link href={`/dashboard/listings/${p.id}`} className="block rounded-2xl bg-surface-2 py-3 text-center text-sm font-semibold">
                  นี่คือประกาศของคุณ — จัดการประกาศ
                </Link>
              ) : (
                <PropertyActions
                  property={{
                    id: p.id, listing_type: p.listing_type, sale_price: p.sale_price, rent_price: p.rent_price,
                    accepting: p.status === "active" || p.status === "reserved",
                  }}
                  signedIn={Boolean(viewer)}
                  loginHref={`/login?next=/property/${p.code}`}
                />
              )}
            </div>
          </Card>
          {!isMine && <ReportButton targetType="property" targetId={p.id} signedIn={Boolean(viewer)} />}
        </aside>
      </div>

      {(similar?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-extrabold">ทรัพย์ใกล้เคียง</h2>
          <PropertyGrid items={similar as PropertyWithMedia[]} signedIn={Boolean(viewer)} />
        </section>
      )}
    </article>
  );
}
