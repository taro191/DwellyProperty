"use client";

import Link from "next/link";
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
            {isStaff && (
              <Link href="/admin" className="block px-4 py-2 text-accent hover:bg-surface-2">ระบบหลังบ้าน (Admin)</Link>
            )}
          </nav>
          <form action={signOut} className="border-t border-line">
            <button className="w-full px-4 py-2.5 text-left text-sm text-red-300 hover:bg-surface-2">ออกจากระบบ</button>
          </form>
        </div>
      )}
    </div>
  );
}
