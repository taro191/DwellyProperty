import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { AppRole, Profile, StaffRole } from "@/lib/types";

export interface Viewer {
  id: string;
  email: string | null;
  profile: Profile;
  roles: AppRole[];
  staffRole: StaffRole | null;
}

/** Current signed-in user with profile, app roles and staff role (memoised per request). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: roles }, { data: staff }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single<Profile>(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("staff_members").select("role, active").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile) return null;

  return {
    id: userId,
    email: (data.claims.email as string | undefined) ?? null,
    profile,
    roles: (roles ?? []).map((r) => r.role as AppRole),
    staffRole: staff?.active ? (staff.role as StaffRole) : null,
  };
});

export async function requireViewer(next = "/"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** Staff gate for /admin. super_admin passes every check. */
export function hasStaffRole(viewer: Viewer | null, roles?: StaffRole[]): boolean {
  if (!viewer?.staffRole) return false;
  if (!roles || viewer.staffRole === "super_admin") return true;
  return roles.includes(viewer.staffRole);
}

export async function requireStaff(roles?: StaffRole[]): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!hasStaffRole(viewer, roles)) redirect("/admin?denied=1");
  return viewer;
}
