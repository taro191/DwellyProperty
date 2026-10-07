"use client";

import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(site)/login/actions";
import { Avatar } from "@/components/avatar";

const LINKS = [
  { href: "/dashboard", label: "ศูนย์ผู้ขาย / ประกาศของฉัน" },
  { href: "/me/favorites", label: "ทรัพย์ที่บันทึกไว้" },
  { href: "/me/activity", label: "นัดหมายและข้อเสนอของฉัน" },
  { href: "/me/verification", label: "ยืนยันตัวตน" },
  { href: "/me", label: "ตั้งค่าบัญชี" },
  { href: "/me/privacy", label: "ความเป็นส่วนตัว (PDPA)" },
];

export function UserMenu({ name, avatar, isStaff }: { name: string; avatar: string | null; isStaff: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="rounded-full" aria-label="เมนูบัญชี" aria-expanded={open}>
        <Avatar name={name} src={avatar} size={34} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          <div className="border-b border-line px-4 py-3 text-sm font-semibold truncate">{name}</div>
          <nav className="py-1 text-sm" onClick={() => setOpen(false)}>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="block px-4 py-2 text-muted hover:bg-surface-2 hover:text-fg">
                {l.label}
              </Link>
            ))}
          </nav>
          {isStaff && (
            <Link href="/admin" onClick={() => setOpen(false)}
              className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-sm font-semibold text-accent hover:bg-surface-2">
              <Shield className="h-4 w-4" /> ระบบหลังบ้าน (Admin)
            </Link>
          )}
          <form action={signOut} className="border-t border-line">
            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-300 hover:bg-surface-2">
              <LogOut className="h-4 w-4" /> ออกจากระบบ
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
