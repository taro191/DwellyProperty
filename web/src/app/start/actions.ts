"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { INTRO_COOKIE, ROLE_COOKIE, ROLE_LANDING, YEAR, isAppRole } from "@/lib/intro";

/** Splash role step: remember the role for sign-up and open that role's starting page. */
export async function startAs(fd: FormData): Promise<void> {
  const role = fd.get("role");
  const jar = await cookies();
  jar.set(INTRO_COOKIE, "1", { maxAge: YEAR, path: "/", sameSite: "lax" });
  if (!isAppRole(role)) redirect("/");
  jar.set(ROLE_COOKIE, role, { maxAge: YEAR, path: "/", sameSite: "lax" });
  redirect(ROLE_LANDING[role]);
}
