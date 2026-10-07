"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

export function TabNav({ tabs }: { tabs: { href: string; label: string; exact?: boolean; count?: number }[] }) {
  const path = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((t) => {
          const active = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                active ? "border-accent text-fg" : "border-transparent text-subtle hover:text-fg",
              )}
            >
              {t.label}
              {Boolean(t.count) && <span className="rounded-full bg-accent px-1.5 text-[10px] text-[#04130d]">{t.count}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
