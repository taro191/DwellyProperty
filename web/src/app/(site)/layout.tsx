import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/bottom-nav";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:pb-12">{children}</main>
      <footer className="hidden border-t border-line py-8 text-sm text-subtle md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
          <p>© {new Date().getFullYear()} Dwelly Property</p>
          <nav className="flex gap-4">
            <Link href="/plans" className="hover:text-fg">แพ็กเกจ</Link>
            <Link href="/legal/terms" className="hover:text-fg">ข้อกำหนดการใช้งาน</Link>
            <Link href="/legal/privacy" className="hover:text-fg">นโยบายความเป็นส่วนตัว</Link>
          </nav>
        </div>
      </footer>
      <BottomNav />
    </>
  );
}
