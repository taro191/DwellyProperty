import { requireViewer } from "@/lib/auth";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  await requireViewer("/dashboard");
  return children;
}
