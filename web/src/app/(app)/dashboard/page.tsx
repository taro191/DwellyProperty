import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building, Calendar, Eye, FilePen, Heart, MessageSquare, Plus, ShieldAlert, Sparkles, TrendingUp, Users } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { coverUrl } from "@/lib/format";
import { landSizeLabel, num, toListingView } from "@/lib/listing-view";
import { STATUS_LABEL } from "@/lib/constants";
import { listManagedListings, sellerWeekStats } from "@/server/services/listings";
import { listAppointments, listInquiries, listOffers, sellerCounts } from "@/server/services/deals";
import { AppointmentCard, LeadCard, OfferCard } from "@/components/deals";

export const metadata: Metadata = { title: "Seller & Landlord Center" };

const TABS = ["ภาพรวม", "รายการที่ลงขาย", "Leads ผู้สนใจ", "นัดหมายดูห้อง", "การต่อรองราคา"];
const empty = (text: string) => <p className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">{text}</p>;

/** Seller & Landlord Center (design: `Wx`, screen "seller-dashboard"). */
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const viewer = await requireViewer("/dashboard");
  const sp = await searchParams;
  const tab = Math.min(4, Math.max(0, Number(sp.tab) || 0));
  const [listings, counts, week, leads, appts, offers] = await Promise.all([
    listManagedListings(viewer),
    sellerCounts(viewer),
    sellerWeekStats(viewer),
    listInquiries(viewer, "seller"),
    listAppointments(viewer, "seller"),
    listOffers(viewer, "seller"),
  ]);
  const role = viewer.profile.primary_role;

  if (listings.length === 0 && role !== "owner" && role !== "agent") {
    return (
      <div className="min-h-dvh pb-24 bg-[var(--bg)] flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[var(--surface)] border border-rose-500/40 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-lg text-[var(--text-primary)]">สำหรับ &quot;เจ้าของทรัพย์ (Owner / Seller)&quot;</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                ขณะนี้คุณใช้งานในบทบาทอื่น ลงประกาศแรกหรือสลับบทบาทเป็นเจ้าของทรัพย์เพื่อเริ่มใช้ Seller & Landlord Center
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/dashboard/listings/new" className="w-full py-2.5 rounded-xl font-bold text-xs bg-[var(--accent)] text-[var(--bg)] shadow-md hover:brightness-110 transition-all">
                ลงประกาศอสังหาฯ แรกของคุณ
              </Link>
              <Link href="/me" className="w-full py-2.5 rounded-xl font-bold text-xs bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-all flex items-center justify-center gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                <span>กลับไปหน้าโปรไฟล์ (สลับบทบาท)</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const active = listings.filter((l) => l.status === "active").length;
  return (
    <div className="min-h-dvh pb-24 bg-[var(--bg)]">
      <div className="px-4 pt-4 grid grid-cols-2 gap-2.5">
        {[
          { label: "รายการที่ลงประกาศ", value: `${active}/${listings.length}`, icon: Building, color: "text-[var(--accent)]", tab: 1 },
          { label: "Leads ผู้สนใจใหม่", value: `${counts.newLeads ?? 0}`, icon: Users, color: "text-[var(--warning)]", tab: 2 },
          { label: "นัดหมายรอยืนยัน", value: `${counts.pendingAppts ?? 0}`, icon: Calendar, color: "text-[var(--success)]", tab: 3 },
          { label: "Offers รอพิจารณา", value: `${counts.pendingOffers ?? 0}`, icon: FilePen, color: "text-purple-400", tab: 4 },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <Link href={`/dashboard?tab=${c.tab}`} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm" key={c.label}>
              <div className="flex items-center justify-between mb-1.5">
                <Icon className={`w-5 h-5 ${c.color}`} />
                <span className={`text-2xl font-black ${c.color}`}>{c.value}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">{c.label}</p>
            </Link>
          );
        })}
      </div>
      <div className="mx-4 mt-3.5 p-4 rounded-2xl bg-gradient-to-r from-[#0D1A12] to-[#121914] border border-[var(--accent)]/30 flex items-center justify-between gap-3 shadow-md">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)] flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            DWELLY EXPOSURE & MEMBERSHIP
          </span>
          <p className="font-bold text-sm text-[var(--text-primary)] mt-0.5">แพ็กเกจสมาชิกเจ้าของ & ดันประกาศ</p>
          <p className="text-xs text-[var(--text-secondary)]">เลือกแพ็กเกจ Owner Pro หรือดันประกาศ เพิ่มการมองเห็น</p>
        </div>
        <Link href="/plans?for=owner" className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)] flex-shrink-0 shadow-md hover:opacity-90">
          ดูแพ็กเกจ
        </Link>
      </div>
      <div className="mx-4 mt-2.5 p-4 rounded-2xl bg-gradient-to-r from-[#12281a] to-[var(--surface)] border border-[var(--accent)]/40 flex items-center justify-between gap-3 shadow-md">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)] flex items-center gap-1">⚡ DWELLY DYNAMIC COMMISSION</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">สิทธิ์เจ้าของทรัพย์</span>
          </div>
          <p className="font-bold text-sm text-[var(--text-primary)] mt-0.5">ระบบคอมมิชชั่นสำหรับนายหน้า Co-Agent</p>
          <p className="text-xs text-[var(--text-secondary)]">กำหนดอัตราค่าคอมฯ ขาย/เช่า และอนุมัตินายหน้าที่ขอสิทธิ์ ได้ในหน้าจัดการแต่ละประกาศ</p>
        </div>
        <Link
          href="/dashboard/commission"
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface-2)] border border-[var(--accent)]/40 text-[var(--accent)] flex-shrink-0 hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-colors"
        >
          ตั้งค่าคอมฯ
        </Link>
      </div>
      <div className="mx-4 mt-2.5 p-4 rounded-2xl bg-gradient-to-r from-[#0c222e] via-[var(--surface)] to-[#0c1a24] border border-sky-500/40 flex items-center justify-between gap-3 shadow-md">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1">🤝 OWNER - AGENT COLLABORATION</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">เช่า & ขาย • หลายคน</span>
          </div>
          <p className="font-bold text-sm text-[var(--text-primary)] mt-0.5">ศูนย์บริหารจัดการนายหน้าตัวแทน</p>
          <p className="text-xs text-[var(--text-secondary)]">ดูนายหน้าที่ขอสิทธิ์ขายทรัพย์ของคุณ และอนุมัติ/ยกเลิกสิทธิ์</p>
        </div>
        <Link href="/dashboard/collab" className="px-3.5 py-2 rounded-xl text-xs font-black bg-sky-400 text-black flex-shrink-0 hover:bg-sky-300 transition-colors shadow-md">
          จัดการนายหน้า
        </Link>
      </div>
      <div className="flex gap-2 px-4 mt-4 overflow-x-auto no-scrollbar border-b border-[var(--border)]">
        {TABS.map((t, i) => (
          <Link
            href={`/dashboard?tab=${i}`}
            scroll={false}
            className={`shrink-0 px-3.5 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${tab === i ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-white"}`}
            key={t}
          >
            {t}
          </Link>
        ))}
      </div>
      {tab === 0 && (
        <div className="px-4 pt-4 flex flex-col gap-3.5">
          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
              ประสิทธิภาพรอบ 7 วันที่ผ่านมา
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "ยอดเข้าชมรวม", val: `${num(week.views)} ครั้ง` },
                { label: "ผู้สนใจบันทึกไว้", val: `${num(week.saves)} คน` },
                { label: "ติดต่อสอบถาม", val: `${num(week.contacts)} ข้อความ` },
              ].map((c) => (
                <div className="p-2.5 rounded-xl bg-[var(--surface-2)]" key={c.label}>
                  <p className="font-extrabold text-base text-[var(--text-primary)]">{c.val}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
          {leads.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--text-secondary)]">ผู้สนใจล่าสุด</p>
              {leads.slice(0, 3).map((l) => (
                <LeadCard l={l} key={l.id} />
              ))}
            </div>
          )}
          <Link
            href="/dashboard/listings/new"
            className="w-full py-4 rounded-2xl font-bold text-sm bg-[var(--surface)] border-2 border-dashed border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5 text-[var(--accent)]" />+ ลงประกาศอสังหาฯ เพิ่มเติม
          </Link>
        </div>
      )}
      {tab === 1 && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          <Link href="/dashboard/listings/new" className="w-full py-3 rounded-2xl font-bold text-xs bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center gap-1.5 shadow-md">
            <Plus className="w-4 h-4" />
            ลงประกาศอสังหาฯ ใหม่
          </Link>
          {listings.map((p) => {
            const v = toListingView(p);
            const cover = coverUrl(p.property_media);
            return (
              <div className="rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-sm" key={p.id}>
                <div className="flex gap-3 p-3">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="w-[72px] h-[72px] rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-[72px] h-[72px] rounded-xl flex-shrink-0 bg-[var(--surface-2)] flex items-center justify-center text-[10px] text-[var(--text-secondary)]">ไม่มีรูป</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{p.title}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 ${p.status === "active" ? "bg-[var(--success)]/15 text-[var(--success)]" : p.status === "rejected" ? "bg-rose-500/15 text-rose-400" : "bg-amber-500/15 text-amber-400"}`}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <p className="text-xs text-[var(--accent)] font-extrabold">
                        ฿{num(v.price)}
                        {v.listingType === "rent" ? "/ด." : ""}
                      </p>
                      {v.land ? (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">🏞️ {landSizeLabel(v.land)}</span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-secondary)]">• {v.size} ตร.ม.</span>
                      )}
                    </div>
                    <div className="flex gap-3.5 mt-2 text-[11px] text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-[var(--accent)]" /> {p.views_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-red-400" /> {p.saves_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> {p.inquiries_count}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex border-t border-[var(--border)] text-xs font-semibold">
                  <Link href={`/property/${p.code}`} className="flex-1 py-2.5 text-center text-[var(--text-secondary)] hover:text-white border-r border-[var(--border)]">
                    ดูทรัพย์
                  </Link>
                  <Link href={`/dashboard/listings/${p.id}`} className="flex-1 py-2.5 text-center text-sky-400 hover:text-sky-300 border-r border-[var(--border)]">
                    จัดการ
                  </Link>
                  <Link href="/dashboard?tab=2" className="flex-1 py-2.5 text-center text-[var(--text-secondary)] hover:text-white border-r border-[var(--border)]">
                    ดู Leads
                  </Link>
                  <Link href="/plans?for=owner" className="flex-1 py-2.5 text-center text-[var(--accent)] hover:opacity-80">
                    ดัน Featured
                  </Link>
                </div>
              </div>
            );
          })}
          {listings.length === 0 && empty("ยังไม่มีประกาศ")}
        </div>
      )}
      {tab === 2 && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {leads.map((l) => (
            <LeadCard l={l} key={l.id} />
          ))}
          {leads.length === 0 && empty("ยังไม่มีผู้สนใจ เมื่อมีคนติดต่อประกาศของคุณจะแสดงที่นี่")}
        </div>
      )}
      {tab === 3 && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {appts.map((a) => (
            <AppointmentCard a={a} side="seller" property={a.properties} other={a.party} key={a.id} />
          ))}
          {appts.length === 0 && empty("ยังไม่มีคำขอนัดชม")}
        </div>
      )}
      {tab === 4 && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {offers.map((o) => (
            <OfferCard o={o} side="seller" property={o.properties} other={o.party} key={o.id} />
          ))}
          {offers.length === 0 && empty("ยังไม่มีข้อเสนอราคา")}
        </div>
      )}
    </div>
  );
}
