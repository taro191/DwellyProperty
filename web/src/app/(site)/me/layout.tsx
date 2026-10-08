import { requireViewer } from "@/lib/auth";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { href: "/me", label: "โปรไฟล์", exact: true },
  { href: "/me/favorites", label: "ที่บันทึกไว้" },
  { href: "/me/activity", label: "นัดหมาย & ข้อเสนอ" },
  { href: "/me/verification", label: "ยืนยันตัวตน" },
  { href: "/me/privacy", label: "ความเป็นส่วนตัว" },
];

export default async function MeLayout({ children }: LayoutProps<"/me">) {
  await requireViewer("/me");
  return (
    <div>
      <TabNav tabs={TABS} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
