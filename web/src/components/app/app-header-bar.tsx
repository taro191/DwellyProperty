"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft, Bell, Building, ChevronRight, CirclePlus, Compass, House, Key, LogOut, Menu, MessageSquare, Search, Shield, ShieldCheck,
  Sparkles, Trees, User, X,
} from "lucide-react";

const MENU = [
  { href: "/", label: "หน้าหลัก (Home)", sub: "ศูนย์รวมอสังหาฯ ซื้อ เช่า ขาย ทั่วไทย", icon: House, color: "text-[var(--accent)]" },
  { href: "/buy", label: "ซื้ออสังหาริมทรัพย์", sub: "บ้านเดี่ยว คอนโด ทาวน์โฮม ทุกทำเล", icon: Building, color: "text-emerald-400" },
  { href: "/rent", label: "เช่าอสังหาริมทรัพย์", sub: "ห้องเช่า คอนโด บ้านเช่า สัญญาพร้อมอยู่", icon: Key, color: "text-sky-400", badge: "ยอดนิยม" },
  { href: "/land", label: "ตลาดที่ดิน", sub: "โฉนดครุฑแดง ทำเลศักยภาพสูง ทั่วไทย", icon: Trees, color: "text-amber-400" },
  { href: "/zones", label: "Dwelly Zones", sub: "สำรวจคอลเลกชันโซนเด่นคัดสรรพิเศษ", icon: Compass, color: "text-purple-400" },
  { href: "/dashboard/listings/new", label: "ลงประกาศ ขาย/ให้เช่า", sub: "เจ้าของโดยตรง และนายหน้า ฟรี", icon: CirclePlus, color: "text-rose-400", badge: "ฟรี" },
  { href: "/buyer-center", label: "ศูนย์บริการผู้ซื้อ (Buyer Center)", sub: "ตั้งเกณฑ์ความต้องการ จัดการคัดกรอง", icon: ShieldCheck, color: "text-cyan-400" },
  { href: "/messages", label: "กล่องข้อความ & แชต", sub: "สนทนากับเจ้าของทรัพย์และนายหน้า", icon: MessageSquare, color: "text-teal-400" },
];

type HeaderConfig = { title?: string; back?: string | true; showSearch?: boolean };

/** Title / back button per route, as each prototype screen passes them to `fu`. null = the screen draws its own top bar. */
function headerFor(path: string): HeaderConfig | null {
  const exact: Record<string, HeaderConfig> = {
    "/": { title: "Dwelly Thailand", showSearch: false },
    "/zones": { title: "Dwelly Zone", showSearch: false },
    "/buy": { showSearch: false },
    "/land": { title: "ที่ดิน", showSearch: false },
    "/rent": { title: "เช่าอสังหาริมทรัพย์", showSearch: false },
    "/buyer-center": { title: "ศูนย์ผู้ซื้อ (Buyer Center)", showSearch: false },
    "/me": { title: "โปรไฟล์ผู้ใช้งาน (Profile)", showSearch: false },
    "/messages": { title: "ข้อความ (Dwelly Inbox)" },
    "/notifications": { title: "การแจ้งเตือน (Notifications)", showSearch: false },
    "/hubs": {},
    "/dashboard": { title: "Seller & Landlord Center" },
    "/dashboard/agent": { title: "Agency Pro Dashboard" },
    "/dashboard/agent/collab": { title: "Agency-Owner Collab", back: "/dashboard/agent", showSearch: false },
    "/dashboard/commission": { title: "ระบบ Dwelly Commission", back: true, showSearch: false },
    "/dashboard/collab": { title: "ศูนย์บริหารนายหน้า (Owner-Agent Hub)", back: "/dashboard", showSearch: false },
    "/map": { title: "Dwelly Map" },
    "/pass": { title: "Your Dwelly Pass" },
    "/activities": { title: "ตารางกิจกรรม (Events)" },
    "/login": { title: "เข้าสู่ระบบ / สมัครสมาชิก", back: true, showSearch: false },
  };
  if (exact[path]) return exact[path];
  if (path === "/plans" || path === "/dashboard/listings/new" || path.startsWith("/property/") || path.startsWith("/zones/") || path.startsWith("/messages/")) return null;
  return { back: true };
}

export type HeaderUser = { name: string; avatar: string | null; isStaff: boolean } | null;

/** Top bar + shortcut menu (design: `fu`). */
export function AppHeaderBar({
  unreadCount, user, signOutAction,
}: {
  unreadCount: number;
  user: HeaderUser;
  signOutAction: () => Promise<void>;
}) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const cfg = headerFor(path);
  if (!cfg) return null;
  const { title, back, showSearch = true } = cfg;
  const iconBtn = "p-1.5 sm:p-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer";
  const goBack = () => {
    if (typeof back === "string") router.push(back);
    else if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-3 sm:px-4 h-14 gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {back ? (
              <button
                type="button"
                onClick={goBack}
                className="p-1.5 -ml-1 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors shrink-0 cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}
            {title ? (
              <h2 className="font-semibold text-sm sm:text-base text-[var(--text-primary)] tracking-tight truncate">{title}</h2>
            ) : (
              <Link href="/" className="flex items-center gap-1.5 sm:gap-2 text-left group truncate cursor-pointer">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1c242e] to-[#0d0f12] border border-[var(--accent)]/50 flex items-center justify-center shadow-sm shrink-0 group-hover:border-[var(--accent)] transition-all">
                  <span className="text-sm font-black text-[var(--accent)] lowercase tracking-tighter leading-none select-none font-sans">d</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--text-primary)] shrink-0">DWELLY</span>
                  <span className="font-black text-sm sm:text-base tracking-tight text-[var(--accent)] flex items-center gap-0.5 sm:gap-1 shrink-0">
                    THAILAND
                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--accent)]" />
                  </span>
                </div>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {showSearch && (
              <Link href="/buy" className={iconBtn} aria-label="Search properties">
                <Search className="w-4 h-4" />
              </Link>
            )}
            <Link href="/notifications" className={`${iconBtn} relative`} aria-label="Notifications">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface)] animate-pulse" />}
            </Link>
            <Link
              href={user ? "/me" : "/login"}
              className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)] transition-all shadow-sm cursor-pointer"
              aria-label="User Profile"
            >
              {user ? (
                user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                )
              ) : (
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--text-secondary)]" />
              )}
            </Link>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer border ${open ? "bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] shadow-md shadow-[var(--accent)]/20" : "bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent)]/50"}`}
              aria-label="Toggle Navigation Menu"
              aria-expanded={open}
            >
              {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-50 flex flex-col justify-start">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg mx-auto bg-[var(--surface)] border-b border-[var(--border)] shadow-2xl rounded-b-3xl p-4 space-y-2 max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-[var(--border)]">
              <div>
                <p className="text-xs font-black text-[var(--text-primary)]">เมนูทางลัด Dwelly Thailand</p>
                <p className="text-[10px] text-[var(--text-secondary)]">เข้าถึงทุกบริการซื้อ เช่า ขาย และจัดการทรัพย์</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Online</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {[...MENU, ...(user?.isStaff ? [{ href: "/admin", label: "ระบบหลังบ้าน (Admin)", sub: "จัดการผู้ใช้ ประกาศ และการตรวจสอบ", icon: Shield, color: "text-amber-400", badge: undefined }] : [])].map((p) => {
                const Icon = p.icon;
                return (
                  <Link
                    href={p.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 border border-[var(--border)] hover:border-[var(--accent)]/40 transition-all text-left cursor-pointer group"
                    key={p.href}
                  >
                    <div className={`w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center shrink-0 ${p.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">{p.label}</span>
                        {p.badge && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-[var(--accent)] text-[var(--bg)] shrink-0">{p.badge}</span>}
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">{p.sub}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                );
              })}
            </div>
            <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2 text-xs">
              <span className="text-[10px] text-[var(--text-secondary)] truncate">ผู้ใช้งาน: {user?.name || "สมาชิกทั่วไป"}</span>
              <div className="flex items-center gap-3 shrink-0">
                {user ? (
                  <form action={signOutAction}>
                    <button className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer flex items-center gap-1">
                      <LogOut className="w-3 h-3" /> ออกจากระบบ
                    </button>
                  </form>
                ) : null}
                <Link href={user ? "/me" : "/login"} onClick={() => setOpen(false)} className="text-[11px] font-extrabold text-[var(--accent)] hover:underline cursor-pointer">
                  {user ? "ดูโปรไฟล์ & การตั้งค่า →" : "เข้าสู่ระบบ / สมัครสมาชิก →"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
