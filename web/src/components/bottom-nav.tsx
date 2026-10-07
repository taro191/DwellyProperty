"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutDashboard, MessageCircle, Search } from "lucide-react";
import { cn } from "@/components/ui";

const ITEMS = [
  { href: "/", label: "หน้าแรก", icon: Home, match: (p: string) => p === "/" },
  { href: "/search", label: "ค้นหา", icon: Search, match: (p: string) => p.startsWith("/search") },
  { href: "/me/favorites", label: "ที่บันทึก", icon: Heart, match: (p: string) => p.startsWith("/me/favorites") },
  { href: "/messages", label: "แชท", icon: MessageCircle, match: (p: string) => p.startsWith("/messages") },
  { href: "/dashboard", label: "ของฉัน", icon: LayoutDashboard, match: (p: string) => p.startsWith("/dashboard") || p.startsWith("/me") },
];

/** Mobile tab bar (prototype's primary navigation). */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <Link
              key={href}
              href={href}
              className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium", active ? "text-accent" : "text-subtle")}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
