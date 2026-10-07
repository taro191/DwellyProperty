import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, MessagesSquare, ShieldCheck } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { favoriteIds, featuredListings, searchListings } from "@/server/services/listings";
import { listZones, liveHub, upcomingActivities } from "@/server/services/content";
import { PropertyGrid } from "@/components/property-card";
import { SearchBar } from "@/components/search-bar";
import { ButtonLink, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export default async function HomePage() {
  const viewer = await getViewer();
  const [zones, latest, featured, hub, activities, favorites] = await Promise.all([
    listZones(),
    searchListings({ sort: "newest" }, { limit: 6 }),
    featuredListings(6),
    liveHub(),
    upcomingActivities(3),
    favoriteIds(viewer?.id),
  ]);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-line bg-gradient-to-br from-[#0c222e] via-surface to-[#0b1a14] px-5 py-10 sm:px-10 sm:py-14">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-strong">
          <ShieldCheck className="h-3.5 w-3.5" /> ทุกประกาศผ่านการตรวจสอบโดยทีม Dwelly
        </p>
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          หาบ้าน คอนโด ที่ดิน <span className="text-accent">ที่ไว้ใจได้</span>
        </h1>
        <p className="mt-3 max-w-xl text-muted">คุยตรงกับเจ้าของหรือนายหน้าที่ยืนยันตัวตนแล้ว นัดชม ยื่นข้อเสนอ ครบในที่เดียว</p>
        <div className="mt-6 max-w-3xl">
          <SearchBar />
        </div>
        {zones.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {zones.map((z) => (
              <Link
                key={z.id}
                href={z.slug === "land" ? "/search?category=land" : `/search?zone=${z.slug}`}
                className="rounded-full border border-line bg-surface-2/80 px-3 py-1.5 text-xs font-medium text-muted hover:border-accent/60 hover:text-fg"
              >
                {z.icon} {z.name_th}
              </Link>
            ))}
          </div>
        )}
      </section>

      {hub && (
        <Link href={`/hubs/${hub.slug}`} className="block">
          <Card className="flex flex-col gap-2 bg-gradient-to-r from-[#1e170d] to-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-300">🔥 Dwelly Hub กำลังจัดอยู่ · ถึง {formatDateTime(hub.ends_at)}</p>
              <p className="text-lg font-bold">{hub.name}</p>
              {hub.description && <p className="text-sm text-subtle">{hub.description}</p>}
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">ดูทรัพย์ในงาน <ArrowRight className="h-4 w-4" /></span>
          </Card>
        </Link>
      )}

      {featured.length > 0 && (
        <section>
          <SectionTitle title="ทรัพย์แนะนำ" href="/search?sort=recommended" />
          <PropertyGrid items={featured} favorites={favorites} signedIn={Boolean(viewer)} />
        </section>
      )}

      <section>
        <SectionTitle title="ประกาศล่าสุด" href="/search?sort=newest" />
        <PropertyGrid items={latest.items} favorites={favorites} signedIn={Boolean(viewer)} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: BadgeCheck, title: "ตรวจสอบกรรมสิทธิ์", body: "ประกาศที่มีป้าย “ตรวจสอบแล้ว” ผ่านการตรวจโฉนดและตัวตนเจ้าของ" },
          { icon: CalendarClock, title: "นัดชมออนไลน์", body: "เลือกชมสถานที่จริงหรือวิดีโอคอล ผู้ขายยืนยันนัดในระบบ" },
          { icon: MessagesSquare, title: "แชทและยื่นข้อเสนอ", body: "ต่อรองราคา ติดตามสถานะ ไม่ต้องเปิดเผยเบอร์จนกว่าจะพร้อม" },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-5">
            <Icon className="h-6 w-6 text-accent" />
            <p className="mt-3 font-bold">{title}</p>
            <p className="mt-1 text-sm text-subtle">{body}</p>
          </Card>
        ))}
      </section>

      {activities.length > 0 && (
        <section>
          <SectionTitle title="กิจกรรมและทัวร์สด" href="/hubs" />
          <div className="grid gap-3 md:grid-cols-3">
            {activities.map((a) => (
              <Card key={a.id} className="p-4">
                <p className="text-xs text-accent">{formatDateTime(a.starts_at)}</p>
                <p className="mt-1 font-semibold">{a.title}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-bold">มีทรัพย์อยากขายหรือปล่อยเช่า?</p>
          <p className="text-sm text-subtle">ลงประกาศฟรี 1 รายการ ทีมงานตรวจสอบและเผยแพร่ภายใน 24 ชั่วโมง</p>
        </div>
        <ButtonLink href="/dashboard/listings/new" size="lg">ลงประกาศฟรี</ButtonLink>
      </Card>
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
        ดูทั้งหมด <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
