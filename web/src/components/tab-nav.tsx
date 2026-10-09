"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

export function TabNav({ tabs }: { tabs: { href: string; label: string; exact?: boolean; count?: number }[] }) {
  const path = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto no-scrollbar px-4">
      <div className="flex min-w-max gap-2 border-b border-[var(--border)]">
        {tabs.map((t) => {
          const active = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-bold whitespace-nowrap transition-colors",
                active ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-white",
              )}
            >
              {t.label}
              {Boolean(t.count) && <span className="rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-black text-[var(--bg)]">{t.count}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
