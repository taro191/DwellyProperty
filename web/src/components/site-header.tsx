import Link from "next/link";
import { Bell, MessageCircle, Plus, Shield } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { unreadNotificationCount } from "@/server/services/notifications";
import { unreadMessageCount } from "@/server/services/chat";
import { buttonClass } from "@/components/ui";
import { UserMenu } from "@/components/user-menu";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-lg">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-[#04130d] text-sm font-black">D</span>
      <span>Dwelly</span>
    </Link>
  );
}


function CountDot({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-[#04130d]">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export async function SiteHeader() {
  const viewer = await getViewer();
  const counts = viewer
    ? { notifications: await unreadNotificationCount(viewer), messages: await unreadMessageCount(viewer) }
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <Link href="/search?type=sale" className="rounded-xl px-3 py-2 text-muted hover:text-fg">ซื้อ</Link>
          <Link href="/search?type=rent" className="rounded-xl px-3 py-2 text-muted hover:text-fg">เช่า</Link>
          <Link href="/search?category=land" className="rounded-xl px-3 py-2 text-muted hover:text-fg">ที่ดิน</Link>
          <Link href="/search?view=map" className="rounded-xl px-3 py-2 text-muted hover:text-fg">แผนที่</Link>
          <Link href="/hubs" className="rounded-xl px-3 py-2 text-muted hover:text-fg">Dwelly Hubs</Link>
          <Link href="/plans" className="rounded-xl px-3 py-2 text-muted hover:text-fg">แพ็กเกจ</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {viewer ? (
            <>
              {viewer.staffRole && (
                <Link href="/admin" className={buttonClass("ghost", "sm", "hidden sm:inline-flex")} title="Admin">
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )}
              <Link href="/dashboard/listings/new" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
                <Plus className="h-4 w-4" /> ลงประกาศ
              </Link>
              <Link href="/messages" className="relative rounded-xl p-2 text-muted hover:text-fg" aria-label="ข้อความ">
                <MessageCircle className="h-5 w-5" />
                <CountDot n={counts?.messages ?? 0} />
              </Link>
              <Link href="/notifications" className="relative rounded-xl p-2 text-muted hover:text-fg" aria-label="การแจ้งเตือน">
                <Bell className="h-5 w-5" />
                <CountDot n={counts?.notifications ?? 0} />
              </Link>
              <UserMenu name={viewer.profile.display_name} avatar={viewer.profile.avatar_url} isStaff={Boolean(viewer.staffRole)} />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost", "sm")}>เข้าสู่ระบบ</Link>
              <Link href="/login?next=/dashboard/listings/new" className={buttonClass("primary", "sm")}>ลงประกาศฟรี</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
