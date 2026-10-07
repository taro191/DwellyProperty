import { requireViewer } from "@/lib/auth";
import { TabNav } from "@/components/tab-nav";

const TABS = [
  { href: "/dashboard", label: "ภาพรวม", exact: true },
  { href: "/dashboard/listings", label: "ประกาศของฉัน" },
  { href: "/dashboard/leads", label: "ผู้สนใจ" },
  { href: "/dashboard/appointments", label: "นัดหมาย" },
  { href: "/dashboard/offers", label: "ข้อเสนอ" },
  { href: "/dashboard/agent", label: "นายหน้า & Co-Agent" },
];

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  await requireViewer("/dashboard");
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">Seller & Landlord Center</p>
      <TabNav tabs={TABS} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
