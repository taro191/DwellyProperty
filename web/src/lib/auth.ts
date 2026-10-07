import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { profiles, staff_members, user_roles } from "@/server/db/schema";
import { isStaff, type Actor } from "@/server/services/core";
import { isConfigured } from "@/lib/env";
import type { AppRole, Profile, StaffRole } from "@/lib/types";

export interface Viewer extends Actor {
  email: string | null;
  profile: Profile;
}

/** Current signed-in user with profile, app roles and staff role (memoised per request). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isConfigured) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const userId = session.user.id;

  const [[profile], roles, [staff]] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
    db.select({ role: user_roles.role }).from(user_roles).where(eq(user_roles.user_id, userId)),
    db.select().from(staff_members).where(eq(staff_members.user_id, userId)).limit(1),
  ]);
  if (!profile || profile.status === "deleted") return null;

  return {
    id: userId,
    email: session.user.email,
    status: profile.status,
    profile: profile as unknown as Profile,
    roles: roles.map((r) => r.role as AppRole),
    staffRole: staff?.active ? (staff.role as StaffRole) : null,
  };
});

export async function requireViewer(next = "/"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

export function hasStaffRole(viewer: Viewer | null, roles?: StaffRole[]): boolean {
  return isStaff(viewer, roles);
}

export async function requireStaff(roles?: StaffRole[]): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!isStaff(viewer, roles)) redirect("/admin?denied=1");
  return viewer;
}
