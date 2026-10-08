import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { enabledProviders } from "@/server/auth";
import { ROLE_COOKIE, isAppRole } from "@/lib/intro";
import { AuthScreen } from "./auth-screen";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  if (await getViewer()) redirect(next);
  const picked = (await cookies()).get(ROLE_COOKIE)?.value;
  return (
    <AuthScreen
      next={next}
      initialMode={sp.mode === "register" ? "register" : "login"}
      providers={enabledProviders}
      defaultRole={isAppRole(picked) ? picked : "buyer"}
      error={sp.error ? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : null}
    />
  );
}
