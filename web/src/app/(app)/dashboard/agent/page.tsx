import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BarChart3, Building, Clock4, Flame, Handshake, PenLine, Plus, ShieldAlert, Users, Zap } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { CATEGORY_LABEL } from "@/lib/constants";
import { coverUrl, formatDate, formatTHB, isFeatured } from "@/lib/format";
import { num } from "@/lib/listing-view";
import { activePlan } from "@/server/services/billing";
import { agentAssignments } from "@/server/services/collab";
import { listBoostProducts } from "@/server/services/content";
import { listInquiries, listOffers } from "@/server/services/deals";
import { listManagedListings } from "@/server/services/listings";
import { getAgentProfile, podTeam, visibleCommissionPrograms } from "@/server/services/trust";

export const metadata: Metadata = { title: "Agency Pro Dashboard" };

const TABS = ["ภาพรวม", "ดันประกาศ (Boost)", "Portfolio ทรัพย์สิน", "ทีมงานนายหน้า", "Analytics"];
const tabHref = (i: number) => `/dashboard/agent?tab=${i}`;

/** Agency Dashboard (design: `am`, screen "agency-dashboard"). */
export default async function AgencyDashboardPage({ searchParams }: PageProps<"/dashboard/agent">) {
  const viewer = await requireViewer("/dashboard/agent");
  const sp = await searchParams;
  const tab = Math.min(4, Math.max(0, Number(sp.tab) || 0));
  const profile = await getAgentProfile(viewer.id);

  if (!profile) {
    return (
      <div className="min-h-dvh pb-24 bg-[var(--bg)] flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[var(--surface)] border border-purple-500/40 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-lg text-[var(--text-primary)]">สำหรับ &quot;นายหน้า (Agency / Agent)&quot;</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">สร้างโปรไฟล์นายหน้าเพื่อเปิดใช้ Agency Dashboard Center รับงานจากเจ้าของ และเข้าร่วม Dwelly Commission</p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/dashboard/agent/profile" className="w-full py-2.5 rounded-xl font-bold text-xs bg-purple-500 text-white shadow-md hover:brightness-110 transition-all">
                สร้างโปรไฟล์นายหน้า
              </Link>
              <Link href="/me" className="w-full py-2.5 rounded-xl font-bold text-xs bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)] transition-all flex items-center justify-center gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                <span>กลับไปหน้าโปรไฟล์</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [managed, jobs, team, plan, leads, offers, boosts, coAgent] = await Promise.all([
    listManagedListings(viewer),
    agentAssignments(viewer),
    podTeam(viewer),
    activePlan(viewer),
    listInquiries(viewer, "seller"),
    listOffers(viewer, "seller"),
    listBoostProducts(),
    visibleCommissionPrograms(viewer),
  ]);
  const mine = managed.filter((p) => p.agent_id === viewer.id || p.owner_id === viewer.id);
  const boosted = mine.filter((p) => isFeatured(p));
  const newLeads = leads.filter((l) => l.status === "new").length;
  const won = leads.filter((l) => l.status === "won").length;
  const views = mine.reduce((n, p) => n + p.views_count, 0);
  const pod = team[0];
  const potential = coAgent.reduce((n, { c, p }) => n + (c.sale_rate_pct != null && p.sale_price ? (Number(p.sale_price) * Number(c.sale_rate_pct)) / 100 : 0), 0);

  return (
    <div className="min-h-dvh pb-24 bg-[var(--bg)]">
      <div className="mx-4 mt-4 p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3.5">
          {viewer.profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewer.profile.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-md" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center font-black text-2xl shadow-md">
              {(profile.company_name ?? viewer.profile.display_name).charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-base text-[var(--text-primary)] truncate">{profile.company_name ?? viewer.profile.display_name}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30">
                {plan ? plan.name.toUpperCase() : "FREE"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
              {profile.agent_code} • {profile.license_verified ? "ใบอนุญาตยืนยันแล้ว" : "ยังไม่ยืนยันใบอนุญาต"}
              {pod ? ` • ${team.length} คนในทีม` : ""}
            </p>
          </div>
          <Link href="/dashboard/agent/profile" className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] shrink-0" aria-label="แก้ไขโปรไฟล์นายหน้า">
            <PenLine className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <div className="px-4 mt-3 grid grid-cols-4 gap-2">
        {[
          { label: "ทรัพย์สินรวม", val: `${mine.length + jobs.length}`, color: "text-[var(--accent)]" },
          { label: "ดันประกาศอยู่", val: `${boosted.length}`, color: "text-amber-400" },
          { label: "Leads ใหม่", val: `${newLeads}`, color: "text-[var(--warning)]" },
          { label: "คอมฯ ที่เปิดรับ", val: potential >= 1e6 ? `฿${(potential / 1e6).toFixed(1)}M` : `฿${num(Math.round(potential))}`, color: "text-purple-400" },
        ].map((z) => (
          <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center shadow-sm" key={z.label}>
            <p className={`font-black text-base ${z.color}`}>{z.val}</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{z.label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-4 mt-4 border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        {TABS.map((z, i) => (
          <Link
            href={tabHref(i)}
            scroll={false}
            className={`shrink-0 px-3.5 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${tab === i ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-secondary)] hover:text-white"}`}
            key={z}
          >
            {i === 1 && <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />}
            {z}
            {i === 1 && boosted.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black">{boosted.length}</span>
            )}
          </Link>
        ))}
      </div>
      {tab === 0 && (
        <div className="px-4 pt-4 flex flex-col gap-3.5">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[var(--surface)] to-amber-900/20 border border-amber-500/40 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  AGENCY PRO BOOST CENTER
                </span>
                <h3 className="font-extrabold text-sm text-[var(--text-primary)] mt-0.5">
                  ดันประกาศอยู่: <span className="text-amber-400">{boosted.length} รายการ</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">ดันประกาศให้ขึ้นอันดับแรก เพิ่มการมองเห็นในหน้าแรกและโซน Featured</p>
              </div>
              <Link href={tabHref(1)} className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-md shrink-0 flex items-center gap-1">
                <span>จัดการดันประกาศ</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          <div className="p-4 rounded-3xl bg-gradient-to-br from-[#1a0e2e] via-[var(--surface)] to-[#110a1f] border border-purple-500/40 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-purple-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  AGENCY - OWNER COLLABORATION
                </span>
                <h3 className="font-extrabold text-sm text-[var(--text-primary)] mt-0.5">ศูนย์เชื่อมโยงเจ้าของทรัพย์ (Owner Co-Work Hub)</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">รายงานผลการพาชมห้องจริง ขอล็อกสิทธิ์ลูกค้า (Lead Lock) และรับแจ้งราคากลางล่าสุดจากเจ้าของทรัพย์โดยตรง</p>
              </div>
              <Link href="/dashboard/agent/collab" className="px-3.5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-xs transition-all shadow-md shrink-0 flex items-center gap-1">
                <span>เปิดระบบเชื่อมโยง</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-purple-500/20 text-[11px] text-purple-300 flex-wrap">
              <span>✓ ซิงก์กับแดชบอร์ดเจ้าของ</span>
              <span>✓ คุ้มครองสิทธิ์ 14 วัน</span>
              <span>✓ รับแจ้งราคา Broadcast</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0D1A12] to-[#121914] border border-[var(--accent)]/30">
            <p className="text-xs font-bold text-[var(--accent)]">🎪 Dwelly Performance</p>
            <div className="grid grid-cols-4 gap-2 mt-3 text-center">
              {[
                [mine.length + jobs.length, "ทรัพย์"],
                [num(views), "วิว"],
                [leads.length, "Leads"],
                [offers.length, "Offers"],
              ].map(([v, l]) => (
                <div key={l as string}>
                  <p className="font-bold text-lg text-[var(--text-primary)]">{v}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/dashboard/listings/new" className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-left hover:border-[var(--accent)]/50 transition-colors">
              <Plus className="w-5 h-5 text-[var(--accent)] mb-2" />
              <p className="font-bold text-sm text-[var(--text-primary)]">เพิ่มทรัพย์สินใหม่</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">เปิดรับดีลตรงจากเจ้าของ</p>
            </Link>
            <Link href="/dashboard/commission" className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-left hover:border-[var(--accent)]/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <ArrowUpRight className="w-5 h-5 text-[var(--accent)]" />
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">สิทธิ์ Dwelly</span>
              </div>
              <p className="font-bold text-sm text-[var(--text-primary)]">Dwelly Commission</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">ทรัพย์ Co-Agent และอัตราค่าคอมฯ</p>
            </Link>
          </div>
        </div>
      )}
      {tab === 1 && (
        <div className="px-4 pt-4 flex flex-col gap-4">
          <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-[var(--surface)] to-purple-900/20 border border-amber-500/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-current" />
                แพ็กเกจดันประกาศ
              </span>
              <Link href="/plans?for=agent" className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-extrabold flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>ซื้อแพ็กเกจ</span>
              </Link>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">ดันประกาศของคุณให้ติดหน้าแรกและโซน Featured เลือกแพ็กเกจตามระยะเวลา ชำระแล้วมีผลทันที</p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] text-center text-xs">
              {boosts.slice(0, 3).map((b, i) => (
                <div className={`p-2 rounded-xl bg-black/40 border ${["border-amber-500/20", "border-orange-500/20", "border-purple-500/20"][i]}`} key={b.id}>
                  <span className={`text-[10px] block font-bold ${["text-amber-400", "text-orange-400", "text-purple-400"][i]}`}>
                    {b.name} ({b.duration_days} วัน)
                  </span>
                  <span className="font-extrabold text-[var(--text-primary)]">{formatTHB(b.price_thb)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>รายการที่กำลังดันประกาศอยู่ ({boosted.length})</span>
            </h4>
            {boosted.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-dashed border-[var(--border)] text-center space-y-2">
                <Zap className="w-8 h-8 text-[var(--text-secondary)] opacity-40 mx-auto" />
                <p className="text-xs text-[var(--text-secondary)] font-semibold">ยังไม่มีทรัพย์ที่กำลังดันประกาศในขณะนี้</p>
              </div>
            ) : (
              boosted.map((z) => (
                <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-amber-500/40 shadow-md flex items-center gap-2.5" key={z.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {coverUrl(z.property_media) && <img src={coverUrl(z.property_media)!} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--border)]" />}
                  <div className="min-w-0 flex-1">
                    <h5 className="font-extrabold text-sm text-[var(--text-primary)] truncate">{z.title}</h5>
                    <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                      <Clock4 className="w-3 h-3 text-amber-400" />
                      หมดอายุ: {formatDate(z.featured_until)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="space-y-3 pt-2">
            <h4 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-1.5">
              <Building className="w-4 h-4 text-purple-400" />
              <span>เลือกทรัพย์สินเพื่อเริ่มดันประกาศ ({mine.filter((p) => p.status === "active").length} รายการ)</span>
            </h4>
            {mine
              .filter((p) => p.status === "active")
              .map((z) => (
                <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-purple-500/40 transition-all flex items-center justify-between gap-3" key={z.id}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 shrink-0">{CATEGORY_LABEL[z.category]}</span>
                      <h5 className="font-extrabold text-sm text-[var(--text-primary)] truncate">{z.title}</h5>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatTHB(z.sale_price ?? z.rent_price)}</p>
                  </div>
                  <Link
                    href="/plans?for=agent"
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-black shadow-md flex items-center gap-1 shrink-0"
                  >
                    <Zap className="w-3 h-3 fill-current" />
                    <span>{isFeatured(z) ? "ต่ออายุ" : "ดันประกาศ"}</span>
                  </Link>
                </div>
              ))}
            {mine.length === 0 && <p className="text-xs text-[var(--text-secondary)]">ดันประกาศได้เฉพาะประกาศที่คุณเป็นเจ้าของหรือผู้ลงประกาศ</p>}
          </div>
        </div>
      )}
      {tab === 2 && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--text-secondary)]">รายการทรัพย์ที่คุณดูแลอยู่ ({mine.length + jobs.length} รายการ)</p>
            <Link href="/dashboard/agent/collab" className="text-xs font-bold text-purple-400 hover:underline flex items-center gap-1">
              <span>ดูสถานะร่วมกับเจ้าของ</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {jobs.map(({ assignment: a, property: p, owner_name, viewings, locks }) => (
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-2.5" key={a.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/30">
                    {a.deal === "sale" ? "งานขาย" : "งานเช่า"} • {a.contract === "exclusive" ? "⭐ Exclusive" : "Open Co-Agent"}
                  </span>
                  <h4 className="font-extrabold text-sm text-[var(--text-primary)] mt-1 truncate">{p.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)]">{CATEGORY_LABEL[p.category]}</p>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md text-emerald-400 bg-emerald-500/15 shrink-0">
                  พาชม {viewings} • ล็อก {locks}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border)]">
                <div>
                  <span className="text-[11px] text-[var(--text-secondary)] block">ราคาประกาศ</span>
                  <span className="font-black text-purple-400">{a.deal === "rent" ? `${formatTHB(p.rent_price)}/ด.` : formatTHB(p.sale_price)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[var(--text-secondary)] block">เจ้าของทรัพย์</span>
                  <span className="font-semibold text-[var(--text-primary)]">{owner_name}</span>
                </div>
              </div>
              <Link
                href="/dashboard/agent/collab"
                className="w-full py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 font-bold text-xs border border-purple-500/30 transition-colors flex items-center justify-center gap-1"
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>บันทึกพาชม / ล็อกสิทธิ์</span>
              </Link>
            </div>
          ))}
          {mine.map((p) => (
            <Link href={`/dashboard/listings/${p.id}`} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex items-center justify-between gap-2" key={p.id}>
              <div className="min-w-0">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent)]/30">ประกาศของคุณ</span>
                <h4 className="font-extrabold text-sm text-[var(--text-primary)] mt-1 truncate">{p.title}</h4>
                <p className="text-xs text-purple-400 font-black">{formatTHB(p.sale_price ?? p.rent_price)}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            </Link>
          ))}
          {mine.length + jobs.length === 0 && <p className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">ยังไม่มีทรัพย์ในพอร์ต</p>}
        </div>
      )}
      {tab === 3 && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {pod ? (
            team.map((m) => (
              <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm" key={m.user_id}>
                <div className="flex items-center gap-3">
                  {m.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar} alt="" className="w-11 h-11 rounded-xl object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] flex items-center justify-center font-black text-[var(--accent)]">{m.name.charAt(0)}</div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{m.name}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">{m.role === "leader" ? "หัวหน้าทีม" : "สมาชิก"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  {[
                    [m.listings, "ประกาศ", "text-[var(--text-primary)]"],
                    [m.leads, "Leads", "text-[var(--text-primary)]"],
                    [m.closed, "ปิดดีล", "text-[var(--success)]"],
                  ].map(([v, l, c]) => (
                    <div className="p-2 rounded-xl bg-[var(--surface-2)]" key={l as string}>
                      <p className={`font-bold text-sm ${c}`}>{v}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-2">
              <Users className="w-8 h-8 text-[var(--text-secondary)] mx-auto" />
              <p className="text-sm font-bold text-[var(--text-primary)]">ยังไม่มีทีม Agency Pod</p>
              <Link href="/dashboard/agent/profile" className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-purple-500 text-white">
                สร้าง Agency Pod
              </Link>
            </div>
          )}
        </div>
      )}
      {tab === 4 && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
            <h4 className="font-black text-sm text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              สถิติภาพรวม
            </h4>
            {[
              ["ยอดเข้าชมประกาศรวม", `${num(views)} ครั้ง`],
              ["ผู้สนใจทั้งหมด (Leads)", `${leads.length} ราย`],
              ["ข้อเสนอราคา (Offers)", `${offers.length} รายการ`],
              ["ปิดการขาย/เช่าได้ (Won)", `${won} ราย`],
            ].map(([k, v]) => (
              <div className="flex justify-between text-xs py-1.5 border-b border-[var(--border)]" key={k}>
                <span className="text-[var(--text-secondary)]">{k}</span>
                <span className="font-black text-[var(--text-primary)]">{v}</span>
              </div>
            ))}
            <div className="p-3 rounded-2xl bg-purple-900/20 border border-purple-500/30 flex items-center justify-between text-xs">
              <span className="font-bold text-purple-300">อัตราการเปลี่ยน Leads เป็นผู้ซื้อ/ผู้เช่า</span>
              <span className="font-black text-white">{leads.length ? ((won / leads.length) * 100).toFixed(1) : "0.0"}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
