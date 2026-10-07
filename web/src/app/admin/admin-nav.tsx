"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck, Building2, FileClock, Flag, Handshake, LayoutDashboard, Megaphone, ShieldUser, UserX, Users, UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import type { StaffRole } from "@/lib/types";

const ITEMS: { href: string; label: string; icon: typeof Users; roles?: StaffRole[] }[] = [
  { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/admin/listings", label: "ตรวจประกาศ", icon: Building2, roles: ["moderator"] },
  { href: "/admin/verifications", label: "ตรวจเอกสาร", icon: BadgeCheck, roles: ["verifier"] },
  { href: "/admin/reports", label: "รายงานปัญหา", icon: Flag, roles: ["moderator", "support"] },
  { href: "/admin/users", label: "ผู้ใช้", icon: Users, roles: ["support", "verifier"] },
  { href: "/admin/pods", label: "Agency Pods", icon: UsersRound, roles: ["verifier"] },
  { href: "/admin/commission", label: "Co-Agent Partner", icon: Handshake, roles: ["moderator"] },
  { href: "/admin/content", label: "Hubs & Zones", icon: Megaphone, roles: ["moderator"] },
  { href: "/admin/deletions", label: "คำขอลบบัญชี", icon: UserX, roles: ["support"] },
  { href: "/admin/audit", label: "Audit log", icon: FileClock },
  { href: "/admin/staff", label: "ทีมงาน", icon: ShieldUser, roles: ["super_admin"] },
];

export function AdminNav({ role, mobile }: { role: StaffRole; mobile?: boolean }) {
  const path = usePathname();
  const items = ITEMS.filter((i) => !i.roles || role === "super_admin" || i.roles.includes(role));
  return (
    <nav className={cn(mobile ? "flex gap-1 overflow-x-auto" : "mt-6 flex flex-col gap-0.5")}>
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
              active ? "bg-accent/10 font-semibold text-accent-strong" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
