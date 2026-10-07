// Every page reads the database or the session at request time.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { Logo } from "@/components/site-header";
import { AdminNav } from "./admin-nav";
import { STAFF_ROLE_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Dwelly Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer?.staffRole) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-bold">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-sm text-subtle">หน้านี้สำหรับทีมงาน Dwelly เท่านั้น</p>
        <Link href="/" className="text-accent underline">กลับหน้าแรก</Link>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 md:flex">
        <div className="px-2"><Logo /></div>
        <p className="mt-1 px-2 text-xs text-subtle">Back office · {STAFF_ROLE_LABEL[viewer.staffRole]}</p>
        <AdminNav role={viewer.staffRole} />
        <Link href="/" className="mt-auto px-2 text-xs text-subtle hover:text-fg">← กลับเว็บไซต์</Link>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-line bg-surface px-4 py-3 md:hidden">
          <AdminNav role={viewer.staffRole} mobile />
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
