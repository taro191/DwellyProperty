import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "ยินดีต้อนรับ" };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const viewer = await requireViewer("/welcome");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: priv } = await supabase.from("profile_private").select("phone, line_id").eq("user_id", viewer.id).single();

  return (
    <div className="mx-auto max-w-xl">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">ยินดีต้อนรับสู่ Dwelly 👋</h1>
        <p className="mt-1 text-sm text-subtle">ตั้งค่าบัญชีเพียงครั้งเดียว เพื่อให้เราแนะนำทรัพย์และเครื่องมือที่เหมาะกับคุณ</p>
        <WelcomeForm
          next={typeof sp.next === "string" ? sp.next : ""}
          defaults={{
            display_name: viewer.profile.display_name,
            primary_role: viewer.profile.primary_role,
            roles: viewer.roles,
            phone: priv?.phone ?? "",
            line_id: priv?.line_id ?? "",
          }}
        />
      </Card>
    </div>
  );
}
