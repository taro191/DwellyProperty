import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { Alert, Card } from "@/components/ui";
import { LoginForms } from "./login-forms";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  if (await getViewer()) redirect(next);

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">เข้าสู่ระบบ Dwelly</h1>
        <p className="mt-1 text-sm text-subtle">ใช้บัญชีเดียวสำหรับซื้อ เช่า ลงประกาศ และคุยกับผู้ขาย</p>
        {sp.error && (
          <div className="mt-4">
            <Alert tone="danger">เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</Alert>
          </div>
        )}
        <LoginForms next={next} />
        <p className="mt-6 text-xs text-subtle">
          การเข้าสู่ระบบถือว่าคุณยอมรับ <a href="/legal/terms" className="underline">ข้อกำหนดการใช้งาน</a> และ{" "}
          <a href="/legal/privacy" className="underline">นโยบายความเป็นส่วนตัว</a>
        </p>
      </Card>
    </div>
  );
}
