import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requireViewer } from "@/lib/auth";
import { getContact } from "@/server/services/account";
import { Card } from "@/components/ui";
import { ROLE_COOKIE, isAppRole } from "@/lib/intro";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "ยินดีต้อนรับ" };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const viewer = await requireViewer("/welcome");
  const sp = await searchParams;

  const priv = await getContact(viewer.id);
  // Role picked on the /start splash before signing up.
  const picked = (await cookies()).get(ROLE_COOKIE)?.value;
  const primaryRole = !viewer.profile.onboarded_at && isAppRole(picked) ? picked : viewer.profile.primary_role;

  return (
    <div className="mx-auto max-w-xl">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">ยินดีต้อนรับสู่ Dwelly 👋</h1>
        <p className="mt-1 text-sm text-subtle">ตั้งค่าบัญชีเพียงครั้งเดียว เพื่อให้เราแนะนำทรัพย์และเครื่องมือที่เหมาะกับคุณ</p>
        <WelcomeForm
          next={typeof sp.next === "string" ? sp.next : ""}
          defaults={{
            display_name: viewer.profile.display_name,
            primary_role: primaryRole,
            roles: viewer.roles,
            phone: priv?.phone ?? "",
            line_id: priv?.line_id ?? "",
          }}
        />
      </Card>
    </div>
  );
}
