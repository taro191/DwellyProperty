"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Key, Layers, Trees, User } from "lucide-react";

const ITEMS = [
  { href: "/", icon: House, label: "หน้าหลัก" },
  { href: "/zones", icon: Layers, label: "Dwelly Zone" },
  { href: "/land", icon: Trees, label: "ที่ดิน" },
  { href: "/rent", icon: Key, label: "เช่า" },
  { href: "/me", icon: User, label: "โปรไฟล์" },
];

/** Routes that show the tab bar (prototype: `Am` screens). */
const WITH_NAV = ["/", "/buyer-center", "/zones", "/land", "/buy", "/rent", "/me"];

/** Bottom tab bar (design: `Nm`). */
export function BottomNav() {
  const path = usePathname();
  if (!WITH_NAV.includes(path)) return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 min-h-16 h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-[var(--surface)]/95 border-t border-[var(--border)] max-w-md mx-auto shadow-2xl backdrop-blur-md">
      {ITEMS.map(({ href, icon: Icon, label }) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 min-w-0 flex-1 min-h-[48px] transition-all rounded-xl cursor-pointer ${active ? "text-[var(--accent)] font-extrabold" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110 stroke-[2.5]" : "scale-100"}`} />
              {active && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-sm shadow-[var(--accent)]/50" />
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight truncate max-w-full px-0.5 mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
