"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase, Building, Building2, Calendar, Camera, CheckCircle2, ChevronRight, ExternalLink, FileCheck, Heart, Key, LogIn, LogOut, Mail,
  MessageSquare, PenLine, Phone, RotateCcw, Save, Shield, ShieldCheck, Sparkles, Ticket, TrendingUp, Trophy, User, Users, X,
} from "lucide-react";
import { GoogleIcon, LineIcon } from "@/components/app/brand-icons";
import { uploadFile } from "@/lib/upload";
import { saveProfile, setAvatar, switchRole } from "@/app/(site)/me/actions";
import type { AppRole } from "@/lib/types";

const ROLE = {
  buyer: { label: "1. ผู้ซื้อ (Buyer)", icon: User },
  tenant: { label: "2. ผู้เช่า (Tenant)", icon: Key },
  owner: { label: "3. เจ้าของ/ขาย/ให้เช่า", icon: Building },
  investor: { label: "4. นักลงทุน (Investor)", icon: TrendingUp },
  agent: { label: "5. นายหน้า (Agency)", icon: Trophy },
} satisfies Record<AppRole, { label: string; icon: typeof User }>;

/** Role-specific "Center" banner (design: hm, one per role). */
const CENTER: Record<AppRole, { href: string; title: string; sub: string; icon: typeof User; box: string; tag: string; btn: string }> = {
  owner: {
    href: "/dashboard", icon: Building, title: "Seller & Landlord Center (ศูนย์เจ้าของทรัพย์)", sub: "จัดการประกาศขาย/ให้เช่า ดู Leads นัดหมายดูห้อง และต่อรองราคา",
    box: "from-[#201807] via-[#1a1409] to-[var(--surface)] border-amber-500/40", tag: "text-amber-400", btn: "bg-amber-400 text-black hover:bg-amber-300",
  },
  agent: {
    href: "/dashboard/agent", icon: Trophy, title: "Agency Dashboard Center (ศูนย์การทำงานนายหน้า)", sub: "ศูนย์ปฏิบัติการนายหน้า พอร์ตงาน ดูแลลูกค้า และปิดการขาย",
    box: "from-[#180e29] via-[#130b20] to-[var(--surface)] border-purple-500/40", tag: "text-purple-400", btn: "bg-purple-400 text-black hover:bg-purple-300",
  },
  tenant: {
    href: "/rent", icon: Key, title: "ศูนย์ค้นหาห้องเช่า & หอพัก (Rental Center)", sub: "ค้นหาห้องเช่าพร้อมอยู่ เลี้ยงสัตว์ได้ ใกล้ ม.มหิดล และนัดดูห้อง",
    box: "from-[#0c1e2b] via-[#09151e] to-[var(--surface)] border-sky-500/40", tag: "text-sky-400", btn: "bg-sky-400 text-black hover:bg-sky-300",
  },
  investor: {
    href: "/buy", icon: TrendingUp, title: "ศูนย์นักลงทุน (Investor Hub & High Yield)", sub: "ค้นหาทรัพย์ Yield สูง วิเคราะห์ทำเล และแปลงที่ดินศักยภาพ",
    box: "from-[#0d2217] via-[#0a1811] to-[var(--surface)] border-emerald-500/40", tag: "text-emerald-400", btn: "bg-emerald-400 text-black hover:bg-emerald-300",
  },
  buyer: {
    href: "/buyer-center", icon: User, title: "ศูนย์ผู้ซื้อ (Buyer Discovery Center)", sub: "สำรวจบ้าน คอนโด แปลงที่ดินราคาพิเศษ และรับคำปรึกษาสินเชื่อ",
    box: "from-[#0d2217] via-[#0a1811] to-[var(--surface)] border-[var(--accent)]/40", tag: "text-[var(--accent)]", btn: "bg-[var(--accent)] text-[var(--bg)] hover:opacity-90",
  },
};

export type ProfileUser = {
  name: string;
  email: string | null;
  phone: string | null;
  lineId: string | null;
  bio: string | null;
  avatar: string | null;
  provider: "google" | "line" | "credential";
  kyc: boolean;
  role: AppRole;
  isStaff: boolean;
};

/** Profile (design: `hm`, screen "profile"). */
export function ProfileScreen({
  user: o, stats, signOutAction,
}: { user: ProfileUser | null; stats: { saved: number; appointments: number; offers: number; views: number }; signOutAction: () => Promise<void> }) {
  const router = useRouter();
  const role: AppRole = o?.role ?? "buyer";
  const center = CENTER[role];
  const CenterIcon = center.icon;
  const RoleIcon = ROLE[role].icon;
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [editing, setEditing] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };
  const owner = role === "owner";
  const agent = role === "agent";
  const menu = [
    { icon: Building, label: "Seller & Landlord Center (ศูนย์เจ้าของทรัพย์)", sub: "จัดการประกาศขาย/ให้เช่า ดู Leads นัดหมาย และรับ Offer", href: "/dashboard", highlight: true, visible: owner },
    { icon: Users, label: "ศูนย์บริหารจัดการนายหน้า (Owner-Agent Hub)", sub: "จัดการนายหน้าแยกงานเช่า/ขาย ติดตามไทม์ไลน์พาชม และล็อกสิทธิ์", href: "/dashboard/listings", visible: owner },
    { icon: Trophy, label: "Agency Dashboard Center (ศูนย์การทำงานนายหน้า)", sub: "พอร์ตอสังหาฯ ติดตามลูกค้า และสถิติปิดการขาย", href: "/dashboard/agent", highlight: true, visible: agent },
    { icon: Users, label: "ศูนย์เชื่อมโยงเจ้าของทรัพย์ (Agency-Owner Collab)", sub: "รายงานพาชมห้อง ขอล็อกสิทธิ์ลูกค้า (Lead Lock) และรับเงื่อนไขเจ้าของ", href: "/dashboard/leads", visible: agent },
    { icon: ShieldCheck, label: "โปรไฟล์ & ตรวจสอบตัวตนนายหน้า (Agency Profile)", sub: "ตรวจสอบ KYC, บัตรนายหน้า, และสถิติการปิดดีล", href: "/me/verification", visible: agent },
    { icon: Key, label: "ศูนย์ค้นหาห้องเช่า & หอพัก (Rental Center)", sub: "ค้นหาห้องเช่าพร้อมอยู่ เลี้ยงสัตว์ได้ และหอพักใกล้มหาวิทยาลัย", href: "/rent", highlight: true, visible: role === "tenant" },
    { icon: TrendingUp, label: "ศูนย์นักลงทุน (Investor Hub & High Yield)", sub: "ค้นหาทรัพย์สำหรับลงทุน ผลตอบแทน Yield สูง และแปลงที่ดิน", href: "/buy", highlight: true, visible: role === "investor" },
    { icon: Ticket, label: "Dwelly Pass ของคุณ", sub: "ดูตราประทับและสถานะการร่วมงาน Dwelly", href: "/pass", visible: true },
    { icon: Sparkles, label: "แพ็กเกจสมาชิกตามบทบาท & ดันประกาศ", sub: "เลือกแพ็กเกจสำหรับเจ้าของ, นักลงทุน, นายหน้า หรือดันประกาศ", href: "/plans", visible: true },
    { icon: MessageSquare, label: "กล่องข้อความกับการติดต่อ", sub: "ประวัติการแชทและการตอบกลับ", href: "/messages", visible: true },
    { icon: Calendar, label: "รายการนัดหมายดูห้องจริง / Video Call", sub: "วันเวลาและสถานะการนัดหมาย", href: "/me/activity", visible: true },
    { icon: Heart, label: "ทรัพย์ที่บันทึกไว้", sub: "รายการโปรดของคุณ", href: "/me/favorites", visible: Boolean(o) },
    { icon: FileCheck, label: "ยืนยันตัวตน (KYC) & เอกสาร", sub: "ยืนยันตัวตน ใบอนุญาตนายหน้า และกรรมสิทธิ์ทรัพย์", href: "/me/verification", visible: Boolean(o) && !agent },
    { icon: Shield, label: "ความเป็นส่วนตัว & ข้อมูลส่วนบุคคล (PDPA)", sub: "ดาวน์โหลดข้อมูล การยินยอม และการลบบัญชี", href: "/me/privacy", visible: Boolean(o) },
    { icon: Shield, label: "ระบบหลังบ้าน (Admin)", sub: "จัดการผู้ใช้ ประกาศ และการตรวจสอบ", href: "/admin", highlight: true, visible: Boolean(o?.isStaff) },
  ].filter((m) => m.visible);

  const uploadAvatar = (file: File) =>
    startTransition(async () => {
      setError(null);
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error("ไฟล์ใหญ่เกิน 2MB");
        const path = await uploadFile("avatars", "avatar", file, file.name);
        const r = await setAvatar(path);
        if (!r.ok) throw new Error(r.error);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
      }
    });
  const submitProfile = (fd: FormData) =>
    startTransition(async () => {
      for (const k of ["phone", "line_id", "bio"]) if (!String(fd.get(k) ?? "").trim()) fd.delete(k);
      const r = await saveProfile(fd);
      if (r.ok) {
        setEditing(false);
        flash("บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว");
        router.refresh();
      } else setError(r.error);
    });
  const pickRole = (r: AppRole) =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("role", r);
      const res = await switchRole(fd);
      setSwitching(false);
      if (res.ok) {
        flash("สลับบทบาทแล้ว");
        router.refresh();
      } else setError(res.error);
    });
  const input = "w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent)] outline-none";

  return (
    <div className="min-h-screen min-h-[100dvh] pb-safe-nav bg-[var(--bg)]">
      {o ? (
        <div className="mx-4 mt-4 p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                {o.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.avatar} alt={o.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-[var(--accent)] shadow-md" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center font-black text-2xl shadow-lg">{o.name.charAt(0).toUpperCase()}</div>
                )}
                <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-md">
                  {o.provider === "google" ? <GoogleIcon className="w-3.5 h-3.5" /> : o.provider === "line" ? <LineIcon className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5 text-blue-400" />}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-extrabold text-base text-[var(--text-primary)] truncate">{o.name}</h2>
                  {o.kyc && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      ยืนยันแล้ว
                    </span>
                  )}
                </div>
                {o.email && <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{o.email}</p>}
                {o.phone && (
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    {o.phone}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                    <RoleIcon className="w-3.5 h-3.5" />
                    {ROLE[role].label}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              className="p-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-rose-400 hover:border-rose-500/30 border border-[var(--border)] transition-colors shrink-0 cursor-pointer"
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3.5 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-full py-2.5 px-3 rounded-2xl bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 text-[var(--text-primary)] hover:text-[var(--accent)] border border-[var(--border)] hover:border-[var(--accent)]/50 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <PenLine className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>แก้ไขโปรไฟล์ (Edit Profile)</span>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-[var(--border)] text-center">
            {[
              [stats.saved, "บันทึกไว้", "/me/favorites"],
              [stats.appointments, "นัดหมาย", "/me/activity"],
              [stats.offers, "Offer", "/me/activity"],
              [stats.views, "เข้าชม", null],
            ].map(([n, label, href]) => {
              const body = (
                <>
                  <p className="font-extrabold text-lg text-[var(--text-primary)]">{n}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{label}</p>
                </>
              );
              return href ? (
                <Link key={label as string} href={href as string}>
                  {body}
                </Link>
              ) : (
                <div key={label as string}>{body}</div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-4 p-5 rounded-3xl bg-gradient-to-br from-[#122819] to-[var(--surface)] border border-[var(--accent)]/40 shadow-lg text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] mx-auto font-black">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-base text-[var(--text-primary)]">เข้าสู่ระบบ / สมัครสมาชิก</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">เข้าสู่ระบบด้วย Google, LINE หรือ Email เพื่อซิงก์ข้อมูลอสังหาฯ และรับสิทธิพิเศษในงาน</p>
          </div>
          <div className="flex gap-2 justify-center pt-1">
            <Link href="/login?next=/me" className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] font-black text-xs hover:brightness-110 shadow-md flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
              เข้าสู่ระบบ / สร้างบัญชี
            </Link>
          </div>
        </div>
      )}
      <div className="mx-4 mt-4">
        <div className={`p-4 rounded-3xl bg-gradient-to-r border shadow-lg flex items-center justify-between gap-3 ${center.box}`}>
          <div className="min-w-0">
            <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${center.tag}`}>
              <CenterIcon className="w-3.5 h-3.5" />
              CENTER DASHBOARD เฉพาะบทบาทของคุณ
            </span>
            <h3 className="font-extrabold text-sm text-[var(--text-primary)] mt-0.5">{center.title}</h3>
            <p className="text-xs text-[var(--text-secondary)] truncate">{center.sub}</p>
          </div>
          <Link href={center.href} className={`px-3.5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all shrink-0 flex items-center gap-1 cursor-pointer ${center.btn}`}>
            <span>เข้า Center</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
        {menu.map((q) => {
          const Icon = q.icon;
          return (
            <Link href={q.href} className="w-full flex items-center gap-3.5 px-4 py-4 text-left transition-colors border-b border-[var(--border)] hover:bg-[var(--surface-2)]" key={q.label}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${q.highlight ? "bg-[var(--accent)] text-[var(--bg)]" : "bg-[var(--surface-2)] text-[var(--text-secondary)]"}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[var(--text-primary)]">{q.label}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">{q.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => (o ? setSwitching(true) : router.push("/start?step=role"))}
          className="w-full flex items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-[var(--surface-2)]"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--surface-2)] text-[var(--text-secondary)]">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-[var(--text-primary)]">สลับบทบาทการใช้งาน (Switch Role)</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">สลับระหว่าง: 1.ผู้ซื้อ, 2.ผู้เช่า, 3.เจ้าของ/ขาย/ให้เช่า, 4.นักลงทุน, 5.นายหน้า</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
      </div>
      {error && <p className="mx-4 mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">{error}</p>}
      <div className="mx-4 mt-4">
        {o ? (
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 active:scale-[0.99] transition-all font-bold text-sm cursor-pointer shadow-sm"
          >
            <LogOut className="w-4 h-4 stroke-[2.5]" />
            <span>ออกจากระบบ (Log Out)</span>
          </button>
        ) : (
          <Link
            href="/login?next=/me"
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 active:scale-[0.99] transition-all font-bold text-sm cursor-pointer shadow-md"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>เข้าสู่ระบบ / ลงทะเบียนบัญชี (Sign In)</span>
          </Link>
        )}
      </div>
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-base text-[var(--text-primary)]">ยืนยันการออกจากระบบ</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชี {o?.email || o?.name}?</p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <form action={signOutAction} className="flex-1">
                <button className="w-full py-2.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-colors cursor-pointer">ยืนยันออกจากระบบ</button>
              </form>
            </div>
          </div>
        </div>
      )}
      {editing && o && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setEditing(false)}>
          <div className="w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center">
                  <PenLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--text-primary)]">แก้ไขข้อมูลโปรไฟล์</h3>
                  <p className="text-[10px] text-[var(--text-secondary)]">อัปเดตชื่อ รูปภาพ และช่องทางการติดต่อ</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditing(false)} className="p-1.5 rounded-full hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer" aria-label="ปิด">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form action={submitProfile} className="space-y-3.5">
              <div>
                <span className="block text-xs font-bold text-[var(--text-secondary)] mb-2">รูปโปรไฟล์ (Avatar)</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()} className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-[var(--accent)] bg-[var(--surface-2)] shrink-0 shadow-md" aria-label="เปลี่ยนรูปโปรไฟล์">
                    {o.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-lg font-black text-[var(--accent)]">{o.name.charAt(0).toUpperCase()}</span>
                    )}
                    <span className="absolute bottom-0 right-0 p-1 rounded-tl-lg bg-[var(--accent)] text-[var(--bg)]">
                      <Camera className="w-3 h-3" />
                    </span>
                  </button>
                  <div className="text-[11px] text-[var(--text-secondary)] flex-1">
                    <p className="font-bold text-[var(--text-primary)]">{pending ? "กำลังอัปโหลด…" : "แตะรูปเพื่ออัปโหลดรูปใหม่"}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">JPG / PNG / WebP ไม่เกิน 2MB</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                </div>
              </div>
              <label className="block">
                <span className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ชื่อ - นามสกุล *</span>
                <input name="display_name" type="text" required minLength={2} maxLength={80} defaultValue={o.name} placeholder="เช่น กิตติ พรหมมา" className={input} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-[var(--text-secondary)] mb-1">เบอร์โทรศัพท์ (สำหรับติดต่อดีล/นัดหมาย)</span>
                <input name="phone" type="tel" defaultValue={o.phone ?? ""} placeholder="เช่น 081-234-5678" className={input} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-[var(--text-secondary)] mb-1">LINE ID (สำหรับรับข้อมูลทรัพย์และแจ้งเตือน)</span>
                <input name="line_id" type="text" maxLength={50} defaultValue={o.lineId ?? ""} placeholder="เช่น kittiproperty" className={input} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-[var(--text-secondary)] mb-1">แนะนำตัว</span>
                <textarea name="bio" rows={3} maxLength={2000} defaultValue={o.bio ?? ""} className={`${input} resize-none`} />
              </label>
              <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-white border border-[var(--border)] text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] hover:brightness-110 text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[var(--accent)]/20 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกการเปลี่ยนแปลง</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {switching && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={() => setSwitching(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-safe bg-[var(--surface)] border-t border-[var(--border)] shadow-2xl space-y-2" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base text-[var(--text-primary)] mb-2">เลือกบทบาทการใช้งานหลักของคุณ</h3>
            {(Object.keys(ROLE) as AppRole[]).map((r) => {
              const Icon = ROLE[r].icon;
              const on = r === role;
              return (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => pickRole(r)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-left border transition-all ${on ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]/40"}`}
                  key={r}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm flex-1">{ROLE[r].label}</span>
                  {on && <CheckCircle2 className="w-4 h-4" />}
                </button>
              );
            })}
            <p className="text-[10px] text-[var(--text-secondary)] pt-1 flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> นายหน้าควรยืนยันตัวตนและบัตรนายหน้าก่อนรับงาน
            </p>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
      <div className="text-center mt-6 text-xs text-[var(--text-secondary)]">
        <p className="font-bold text-[var(--text-primary)]">Dwelly Property & Data Base Platform</p>
        <p className="mt-0.5">
          <Building2 className="inline w-3 h-3 mr-1" />
          Dwelly Thailand · ซื้อ เช่า ขาย ที่ตรวจสอบแล้ว
        </p>
      </div>
    </div>
  );
}
