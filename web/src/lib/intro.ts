import type { AppRole } from "@/lib/types";

/** Set once a visitor has seen the /start splash; "/" stops redirecting there. */
export const INTRO_COOKIE = "dwelly_intro";
/** Role picked on the splash before signing up; pre-selects the role on /welcome. */
export const ROLE_COOKIE = "dwelly_role";
export const YEAR = 60 * 60 * 24 * 365;

/** Where each role starts browsing after the splash (prototype: I1 role → screen). */
export const ROLE_LANDING: Record<AppRole, string> = {
  buyer: "/search?type=sale",
  tenant: "/search?type=rent",
  owner: "/dashboard",
  investor: "/search?type=sale&sort=newest",
  agent: "/dashboard",
};

export const isAppRole = (v: unknown): v is AppRole => typeof v === "string" && v in ROLE_LANDING;
