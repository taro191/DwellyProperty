"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Calculator, Calendar, CircleAlert, CirclePlus, Compass, FileCheck2, MapPin, MessageSquare, Scale, Search, Send, User, X,
} from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/constants";
import { num, type ListingView } from "@/lib/listing-view";
import type { PropertyCategory } from "@/lib/types";
import { closeBuyerRequest, postBuyerRequest } from "./actions";

const ALL = "ทุกจังหวัด (ทั่วประเทศ)";
const TABS = [
  { id: "search-map", label: "1. ค้นหา & แผนที่", icon: Search },
  { id: "reverse-match", label: "2. โพสต์หาทรัพย์", icon: Send },
  { id: "compare", label: "3. เปรียบเทียบทรัพย์", icon: Scale },
  { id: "mortgage-transfer", label: "4. สินเชื่อ & ค่าโอน", icon: Calculator },
  { id: "deed-zoning", label: "5. ตรวจโฉนด & ผังเมือง", icon: FileCheck2 },
  { id: "appointments", label: "6. ตารางนัดหมายของฉัน", icon: Calendar },
] as const;
type Tab = (typeof TABS)[number]["id"];
const COMPARE_KEY = "dwelly_compare";
const field = "w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2.5 py-2 text-xs font-bold text-[var(--text-primary)] outline-none";

export type RequestItem = {
  id: string; deal: "buy" | "rent"; category: PropertyCategory; province: string; area: string; max_budget: number; criteria: string | null;
  status: "active" | "closed"; matched: number; created: string;
};
export type ApptItem = {
  id: string; code: string; title: string; image: string | null; seller: string; when: string; format: "onsite" | "video" | "phone"; status: string;
};

/** Distance in km between two points. */
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Buyer Center (design: `Tx`, screen "buyer-center"). */
export function BuyerCenterScreen({
  properties: m, provinces, requests, appointments, signedIn, userName, initialTab,
}: {
  properties: ListingView[];
  provinces: string[];
  requests: RequestItem[];
  appointments: ApptItem[];
  signedIn: boolean;
  userName: string | null;
  initialTab: Tab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [province, setProvince] = useState(ALL);
  const [area, setArea] = useState("");
  const [radius, setRadius] = useState("all");
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [budget, setBudget] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const [compareFull, setCompareFull] = useState(false);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COMPARE_KEY) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a per-device list after hydration
      if (Array.isArray(saved)) setCompare(saved.filter((x) => typeof x === "string").slice(0, 4));
    } catch {}
  }, []);
  const saveCompare = (ids: string[]) => {
    setCompare(ids);
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
    } catch {}
  };
  const toggleCompare = (id: string) => {
    if (compare.includes(id)) return saveCompare(compare.filter((x) => x !== id));
    if (compare.length >= 4) {
      setCompareFull(true);
      setTimeout(() => setCompareFull(false), 3000);
      return;
    }
    saveCompare([...compare, id]);
  };
  const pickRadius = (v: string) => {
    setRadius(v);
    setGeoError(null);
    if (v === "all" || here) return;
    if (!navigator.geolocation) return setGeoError("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง");
    navigator.geolocation.getCurrentPosition(
      (pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setGeoError("ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง ระบบจะค้นหาทั้งจังหวัดแทน");
        setRadius("all");
      },
    );
  };

  const results = useMemo(
    () =>
      m.filter((o) => {
        if (province !== ALL && o.province !== province && !o.location.includes(province)) return false;
        if (area.trim()) {
          const q = area.trim().toLowerCase();
          if (!o.location.toLowerCase().includes(q) && !o.name.toLowerCase().includes(q)) return false;
        }
        if (category !== "all" && o.category !== category) return false;
        if (budget && o.price > Number(budget)) return false;
        if (radius !== "all" && here) {
          if (o.lat == null || o.lng == null || km(here, { lat: o.lat, lng: o.lng }) > Number(radius.replace("km", ""))) return false;
        }
        return true;
      }),
    [m, province, area, category, budget, radius, here],
  );
  const compared = m.filter((o) => compare.includes(o.id));

  const submitRequest = (fd: FormData) =>
    startTransition(async () => {
      const r = await postBuyerRequest(fd);
      if (r.ok) {
        setPosting(false);
        router.refresh();
      }
      setNotice(r.ok ? { ok: true, text: r.message ?? "โพสต์แล้ว" } : { ok: false, text: r.fieldErrors ? (Object.values(r.fieldErrors).flat()[0] ?? r.error) : r.error });
    });
  const close = (id: string) =>
    startTransition(async () => {
      const r = await closeBuyerRequest(id);
      if (r.ok) router.refresh();
      else setNotice({ ok: false, text: r.error });
    });

  return (
    <div className="min-h-screen min-h-[100dvh] pb-safe-nav bg-[var(--bg)]">
      <div className="mx-4 mt-3 p-4 rounded-3xl bg-gradient-to-br from-[#0c1813] via-[var(--surface)] to-[#111915] border border-[var(--accent)]/30 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-[var(--accent)]/10 blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)] flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            BUYER DISCOVERY CENTER
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">6 บริการหลักสำหรับผู้ซื้อ</span>
        </div>
        <h1 className="font-extrabold text-lg text-[var(--text-primary)] leading-tight tracking-tight">เครื่องมือและบริการครบวงจรเพื่อการตัดสินใจซื้ออสังหาฯ</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">ค้นหาทั่วประเทศ ฝากสเปกหาทรัพย์ เปรียบเทียบสเปก วางแผนสินเชื่อ ตรวจสอบโฉนด และจัดการนัดหมายในที่เดียว</p>
      </div>
      <div className="mt-3 px-4 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${tab === t.id ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-white"}`}
              key={t.id}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
      {notice && (
        <div className={`mx-4 mt-3 p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 border ${notice.ok ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="ปิด">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {tab === "search-map" && (
        <div className="mx-4 mt-4 space-y-4">
          <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-3">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
              <MapPin className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="font-extrabold text-sm text-[var(--text-primary)]">ค้นหาตามพิกัดและเงื่อนไข (ทั่วประเทศ)</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">จังหวัด:</span>
                <select value={province} onChange={(e) => setProvince(e.target.value)} className={`${field} cursor-pointer`}>
                  {[ALL, ...provinces].map((o) => (
                    <option value={o} key={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">อำเภอ / ทำเล / สถานี:</span>
                <input type="text" placeholder="เช่น เมือง, บางนา, ศาลายา..." value={area} onChange={(e) => setArea(e.target.value)} className={`${field} font-semibold placeholder-[var(--text-secondary)]`} />
              </label>
              <label>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">ประเภทอสังหาฯ:</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${field} cursor-pointer`}>
                  <option value="all">ทุกประเภท</option>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">รัศมีจากตำแหน่งของฉัน:</span>
                <select value={radius} onChange={(e) => pickRadius(e.target.value)} className={`${field} cursor-pointer`}>
                  <option value="all">ทั้งอำเภอ/จังหวัด</option>
                  <option value="3km">รัศมี 3 กม.</option>
                  <option value="5km">รัศมี 5 กม.</option>
                  <option value="10km">รัศมี 10 กม.</option>
                  <option value="25km">รัศมี 25 กม.</option>
                </select>
              </label>
            </div>
            {geoError && <p className="text-[10px] text-amber-400">{geoError}</p>}
            <label className="block">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">งบประมาณสูงสุด (บาท):</span>
              <input type="number" inputMode="numeric" placeholder="เช่น 3,500,000 (เว้นว่างได้)" value={budget} onChange={(e) => setBudget(e.target.value)} className={`${field} font-semibold`} />
            </label>
          </div>
          <Link
            href="/map"
            className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0d2217] to-[var(--surface)] border border-[var(--accent)]/30 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--accent)] transition-all shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-xs text-[var(--text-primary)] truncate">เปิดดูบนแผนที่ (Interactive Map)</p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate">ดูตำแหน่งทรัพย์ แนวถนน และสถานีขนส่งสาธารณะ</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--accent)] shrink-0" />
          </Link>
          <div className="flex items-center justify-between pt-1">
            <span className="font-extrabold text-sm text-[var(--text-primary)]">ผลการค้นหา ({results.length} รายการ)</span>
            <span className="text-[10px] text-[var(--text-secondary)]">กด &quot;+ เทียบ&quot; เพื่อเปรียบเทียบ</span>
          </div>
          {results.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-2">
              <CircleAlert className="w-8 h-8 text-[var(--text-secondary)] mx-auto" />
              <p className="font-bold text-sm text-[var(--text-primary)]">ไม่พบทรัพย์ที่ตรงกับตัวกรอง</p>
              <p className="text-xs text-[var(--text-secondary)]">ลองขยายรัศมีหรือปรับช่วงงบประมาณ</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {results.map((o) => (
                <Link
                  href={`/property/${o.code}`}
                  className="rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-all flex flex-col justify-between group shadow-sm active:scale-[0.98]"
                  key={o.id}
                >
                  <div className="relative h-28 w-full overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.image} alt={o.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-black/70 text-[var(--accent)] border border-[var(--accent)]/30">{CATEGORY_LABEL[o.category]}</span>
                    <span className="absolute bottom-1.5 left-1.5 font-black text-xs text-[var(--accent)] drop-shadow">฿{num(o.price)}</span>
                  </div>
                  <div className="p-2.5 flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[var(--text-primary)] line-clamp-1">{o.name}</h4>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5 text-[var(--accent)] shrink-0" />
                        <span className="truncate min-w-0">{o.location}</span>
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-[var(--border)] flex items-center justify-between text-[9px]">
                      <span className="text-[var(--text-secondary)]">{o.sellerType === "owner" ? "เจ้าของตรง" : "Agency"}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleCompare(o.id);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${compare.includes(o.id) ? "bg-[var(--accent)] text-[var(--bg)]" : "bg-[var(--surface-2)] text-[var(--text-secondary)]"}`}
                      >
                        {compare.includes(o.id) ? "✓ ในตารางเทียบ" : "+ เทียบ"}
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "reverse-match" && (
        <div className="mx-4 mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold text-sm text-[var(--text-primary)]">กระดานความต้องการซื้อ/เช่า (Reverse Match Hub)</h2>
              <p className="text-xs text-[var(--text-secondary)]">ระบุสเปกในฝัน ระบบจับคู่กับประกาศ และเจ้าของ/นายหน้าจะส่งดีลตรงถึงคุณ</p>
            </div>
            <button
              type="button"
              onClick={() => (signedIn ? setPosting(true) : router.push("/login?next=/buyer-center?tab=reverse-match"))}
              className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] text-xs font-black flex items-center gap-1 shadow-md cursor-pointer hover:opacity-95 shrink-0"
            >
              <CirclePlus className="w-3.5 h-3.5" />
              <span>โพสต์หาทรัพย์</span>
            </button>
          </div>
          {posting && (
            <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--accent)]/50 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="font-black text-xs text-[var(--accent)] flex items-center gap-1">
                  <Send className="w-3.5 h-3.5" />
                  ฝากสเปกหาทรัพย์ใหม่ (ระบบจะจับคู่อัตโนมัติ)
                </span>
                <button type="button" onClick={() => setPosting(false)} className="text-[var(--text-secondary)]" aria-label="ปิด">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form action={submitRequest} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">ความประสงค์:</span>
                    <select name="deal" defaultValue="buy" className={field}>
                      <option value="buy">ต้องการซื้อ</option>
                      <option value="rent">ต้องการเช่า</option>
                    </select>
                  </label>
                  <label>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">ประเภททรัพย์:</span>
                    <select name="category" defaultValue="condo" className={field}>
                      {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                        <option value={k} key={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">จังหวัด:</span>
                    <select name="province" defaultValue={provinces[0]} className={field}>
                      {provinces.map((o) => (
                        <option value={o} key={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">อำเภอ / ทำเลที่ต้องการ:</span>
                    <input name="area" type="text" required minLength={2} maxLength={120} placeholder="เช่น พุทธมณฑล / บางนา / นิมมาน" className={`${field} font-semibold`} />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">งบประมาณสูงสุด (บาท):</span>
                  <input name="max_budget" type="number" inputMode="numeric" required min={1} placeholder="เช่น 3,500,000 หรือ ค่าเช่า 12,000" className={`${field} font-semibold`} />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">เงื่อนไขเฉพาะที่ต้องการ:</span>
                  <textarea name="criteria" rows={2} maxLength={1000} placeholder="เช่น ต้องการโฉนดครุฑแดงเท่านั้น, เลี้ยงสุนัขได้, ขอห้องชั้นสูงวิวสระ..." className={`${field} font-medium`} />
                </label>
                <button type="submit" disabled={pending} className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] font-black text-xs hover:opacity-90 shadow-md cursor-pointer disabled:opacity-60">
                  ยืนยันโพสต์ประกาศหาทรัพย์
                </button>
              </form>
            </div>
          )}
          <div className="space-y-3">
            {requests.map((o) => (
              <div className={`p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-2.5 relative overflow-hidden ${o.status === "closed" ? "opacity-50" : ""}`} key={o.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${o.deal === "buy" ? "bg-amber-500 text-black" : "bg-sky-400 text-black"}`}>{o.deal === "buy" ? "ต้องการซื้อ" : "ต้องการเช่า"}</span>
                    <span className="font-extrabold text-xs text-[var(--text-primary)]">{CATEGORY_LABEL[o.category]}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {o.status === "closed" ? "ปิดแล้ว" : `ตรงสเปก ${o.matched} ประกาศ`}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <p className="text-[var(--text-primary)] font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <span>
                      ทำเล: {o.province} ❯ {o.area}
                    </span>
                  </p>
                  <p className="text-emerald-400 font-extrabold">
                    งบประมาณ: ไม่เกิน ฿{num(o.max_budget)} {o.deal === "rent" ? "/เดือน" : ""}
                  </p>
                  {o.criteria && <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed bg-[var(--surface-2)] p-2 rounded-xl border border-[var(--border)]">สเปกที่ต้องการ: {o.criteria}</p>}
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
                  <span className="truncate">
                    ผู้โพสต์: {userName} • {o.created}
                  </span>
                  {o.status === "active" && (
                    <div className="flex items-center gap-3 shrink-0">
                      <button type="button" disabled={pending} onClick={() => close(o.id)} className="font-bold text-rose-400 hover:underline">
                        ปิดโพสต์
                      </button>
                      <Link
                        href={`/${o.deal === "rent" ? "rent" : "buy"}?category=${o.category}`}
                        className="font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>ดูทรัพย์ที่ตรงสเปก</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {requests.length === 0 && !posting && (
              <div className="p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-2">
                <Send className="w-8 h-8 text-[var(--text-secondary)] mx-auto" />
                <p className="font-bold text-sm text-[var(--text-primary)]">ยังไม่มีโพสต์หาทรัพย์</p>
                <p className="text-xs text-[var(--text-secondary)]">บอกสเปกที่ต้องการ แล้วให้เจ้าของและนายหน้าส่งดีลมาหาคุณ</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "compare" && (
        <div className="mx-4 mt-4 space-y-4">
          {compareFull && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between">
              <span>⚠️ สามารถเลือกเปรียบเทียบพร้อมกันได้สูงสุด 4 รายการ</span>
              <button type="button" onClick={() => setCompareFull(false)} className="text-white hover:opacity-80 cursor-pointer" aria-label="ปิด">
                ✕
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-sm text-[var(--text-primary)]">ตารางเปรียบเทียบสเปกอสังหาฯ ({compared.length}/4)</h2>
              <p className="text-xs text-[var(--text-secondary)]">วางเทียบหมัดต่อหมัด ทั้งราคา, ทำเล, ขนาด และผู้ลงประกาศ</p>
            </div>
            {compare.length > 0 && (
              <button type="button" onClick={() => saveCompare([])} className="text-xs text-rose-400 font-bold hover:underline cursor-pointer shrink-0">
                ล้างตารางเทียบ
              </button>
            )}
          </div>
          {compared.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-2">
              <Scale className="w-8 h-8 text-[var(--text-secondary)] mx-auto" />
              <p className="font-bold text-sm text-[var(--text-primary)]">ยังไม่มีรายการในตารางเปรียบเทียบ</p>
              <p className="text-xs text-[var(--text-secondary)]">กลับไปที่แท็บ &quot;ค้นหา & แผนที่&quot; แล้วกดปุ่ม &quot;+ เทียบ&quot; ในการ์ดทรัพย์ที่ท่านสนใจ</p>
              <button type="button" onClick={() => setTab("search-map")} className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--bg)] cursor-pointer">
                ไปเลือกทรัพย์มาเปรียบเทียบ
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-md">
              <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="p-3 font-bold text-[var(--text-secondary)] w-28">หัวข้อ</th>
                    {compared.map((o) => (
                      <th className="p-3 font-bold text-[var(--text-primary)] w-48" key={o.id}>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-extrabold truncate">{o.name}</span>
                          <button type="button" onClick={() => toggleCompare(o.id)} className="text-rose-400 hover:text-white" aria-label="นำออก">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={o.image} alt={o.name} className="w-full h-20 object-cover rounded-lg" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <tr>
                    <td className="p-3 font-bold text-[var(--text-secondary)]">ราคาเสนอขาย</td>
                    {compared.map((o) => (
                      <td className="p-3 font-extrabold text-[var(--accent)] text-sm" key={o.id}>
                        ฿{num(o.price)}
                        {o.listingType === "rent" ? "/ด." : ""}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[var(--text-secondary)]">ราคาต่อหน่วย</td>
                    {compared.map((o) => (
                      <td className="p-3 font-semibold text-[var(--text-primary)]" key={o.id}>
                        {o.land ? `฿${num(o.land.pricePerSqWa)}/ตร.ว.` : o.size ? `฿${num(Math.round(o.price / o.size))}/ตร.ม.` : "-"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[var(--text-secondary)]">ขนาดพื้นที่</td>
                    {compared.map((o) => (
                      <td className="p-3 text-[var(--text-primary)]" key={o.id}>
                        {o.land ? `${num(o.land.totalSqWa)} ตร.ว.` : `${o.size} ตร.ม.`}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[var(--text-secondary)]">ทำเลที่ตั้ง</td>
                    {compared.map((o) => (
                      <td className="p-3 text-[var(--text-secondary)] truncate max-w-[150px]" key={o.id}>
                        {o.location}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[var(--text-secondary)]">ประเภทเอกสาร</td>
                    {compared.map((o) => (
                      <td className="p-3 text-emerald-400 font-bold" key={o.id}>
                        {o.land ? (o.land.deedType ?? "ที่ดิน") : o.category === "condo" ? "กรรมสิทธิ์ห้องชุด (อ.ช. 2)" : "โฉนดที่ดิน"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[var(--text-secondary)]">ตรวจสอบกรรมสิทธิ์</td>
                    {compared.map((o) => (
                      <td className={`p-3 font-bold ${o.verified ? "text-emerald-400" : "text-[var(--text-secondary)]"}`} key={o.id}>
                        {o.verified ? "✓ ตรวจแล้ว" : "ยังไม่ตรวจ"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[var(--text-secondary)]">ผู้ลงประกาศ</td>
                    {compared.map((o) => (
                      <td className="p-3 text-[var(--text-primary)]" key={o.id}>
                        {o.sellerType === "owner" ? "เจ้าของโดยตรง" : "Agency"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[var(--text-secondary)]">การดำเนินการ</td>
                    {compared.map((o) => (
                      <td className="p-3" key={o.id}>
                        <Link href={`/property/${o.code}`} className="block w-full py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-bold text-[10px] text-center cursor-pointer">
                          ดูรายละเอียด
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "mortgage-transfer" && <MortgageCalculator />}
      {tab === "deed-zoning" && <DeedGuide />}

      {tab === "appointments" && (
        <div className="mx-4 mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold text-sm text-[var(--text-primary)]">ตารางนัดหมายชมทรัพย์ของฉัน ({appointments.length})</h2>
              <p className="text-xs text-[var(--text-secondary)]">รายการนัดชมห้องจริง วิดีโอคอลพาชมสด และการติดต่อเจ้าของ/ตัวแทน</p>
            </div>
            <Link href="/buy" className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] text-xs font-black flex items-center gap-1 cursor-pointer shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              <span>สร้างนัดหมายใหม่</span>
            </Link>
          </div>
          <div className="space-y-3">
            {appointments.map((o) => (
              <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-3" key={o.id}>
                <div className="flex items-start gap-3">
                  {o.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.image} alt={o.title} className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-[var(--border)]" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl shrink-0 border border-[var(--border)] bg-[var(--surface-2)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${o.status === "confirmed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : o.status === "pending" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]"}`}
                      >
                        {o.status === "confirmed" ? "ยืนยันนัดแล้ว" : o.status === "pending" ? "รอยืนยันเวลา" : o.status === "completed" ? "เสร็จสิ้น" : "ยกเลิก/ปฏิเสธ"}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{o.format === "onsite" ? "🏢 ชมห้องจริง" : o.format === "video" ? "📹 วิดีโอคอลสด" : "📞 โทรปรึกษา"}</span>
                    </div>
                    <Link href={`/property/${o.code}`} className="block font-bold text-xs text-[var(--text-primary)] mt-1 truncate hover:text-[var(--accent)]">
                      {o.title}
                    </Link>
                    <p className="text-[11px] text-[var(--accent)] font-extrabold mt-0.5">📅 {o.when}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)] min-w-0">
                    <User className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <span className="truncate">ผู้พาชม: {o.seller}</span>
                  </div>
                  <Link href="/me/activity" className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[10px] font-black flex items-center gap-1 shrink-0">
                    <MessageSquare className="w-3 h-3" />
                    จัดการนัด
                  </Link>
                </div>
              </div>
            ))}
            {appointments.length === 0 && (
              <div className="p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-2">
                <Calendar className="w-8 h-8 text-[var(--text-secondary)] mx-auto" />
                <p className="font-bold text-sm text-[var(--text-primary)]">{signedIn ? "ยังไม่มีนัดหมาย" : "เข้าสู่ระบบเพื่อดูนัดหมายของคุณ"}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Mortgage payment + transfer-day costs (design: Tx "สินเชื่อ & ค่าโอน"). */
function MortgageCalculator() {
  const [price, setPrice] = useState(3e6);
  const [downPct, setDownPct] = useState(10);
  const [years, setYears] = useState(30);
  const [rate, setRate] = useState(3.5);
  const [holdYears, setHoldYears] = useState(2);
  const [inHouseReg, setInHouseReg] = useState(false);
  const [seller, setSeller] = useState<"individual" | "corporate">("individual");
  const [relief, setRelief] = useState(true);
  const [split, setSplit] = useState("50-50");

  const down = Math.round(price * (Math.max(0, Math.min(100, downPct)) / 100));
  const loan = Math.max(0, price - down);
  const mr = rate / 100 / 12;
  const n = years * 12;
  const monthly = loan === 0 || n === 0 ? 0 : mr === 0 ? Math.round(loan / n) : Math.round((loan * mr * (1 + mr) ** n) / ((1 + mr) ** n - 1));
  const totalPaid = monthly * n;
  const interest = Math.max(0, totalPaid - loan);
  const income = Math.round(monthly / 0.4);
  const reliefOn = relief && price <= 7e6;
  const fee = Math.round(price * (reliefOn ? 1e-4 : 0.02));
  const mortgageFee = Math.round(loan * (reliefOn ? 1e-4 : 0.01));
  const loanStamp = Math.min(1e4, Math.round(loan * 5e-4));
  const stampOnly = holdYears >= 5 || inHouseReg;
  const tax = Math.round(stampOnly ? price * 0.005 : price * 0.033);
  const wht = Math.round(seller === "corporate" ? price * 0.01 : price * 0.015);
  const buyerFee = split === "50-50" ? Math.round(fee / 2) : split === "buyer-transfer" || split === "buyer-all" ? fee : 0;
  const sellerFee = split === "50-50" ? fee - buyerFee : split === "seller-all" ? fee : 0;
  const buyerTax = split === "buyer-all" ? tax + wht : 0;
  const sellerTax = split === "buyer-all" ? 0 : tax + wht;
  const buyerDay = buyerFee + mortgageFee + loanStamp + buyerTax;
  const buyerCash = down + buyerDay;
  const sellerCost = sellerFee + sellerTax;
  const opt = (on: boolean) =>
    `py-2 px-3 rounded-xl font-bold transition-all text-left cursor-pointer ${on ? "bg-[var(--accent)] text-[var(--bg)] shadow-xs" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`;

  return (
    <div className="mx-4 mt-4 space-y-4">
      <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
          <Calculator className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="font-extrabold text-sm text-[var(--text-primary)]">เครื่องคำนวณสินเชื่อบ้าน/ที่ดิน & ค่าใช้จ่ายวันโอน</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">ราคาซื้อขายอสังหาฯ (บาท):</span>
            <input type="number" step="50000" value={price} onChange={(e) => setPrice(Number(e.target.value))} className={`${field} text-[var(--accent)]`} />
          </label>
          <label>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">เงินดาวน์ (%):</span>
            <input type="number" min="0" max="50" value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className={`${field} font-semibold`} />
          </label>
          <label>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">ระยะเวลากู้ (ปี):</span>
            <select value={years} onChange={(e) => setYears(Number(e.target.value))} className={`${field} cursor-pointer`}>
              {[10, 15, 20, 25, 30].map((y) => (
                <option value={y} key={y}>
                  {y} ปี ({y * 12} งวด)
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">อัตราดอกเบี้ยเฉลี่ย (% ต่อปี):</span>
            <input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} className={`${field} font-semibold`} />
          </label>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1e13] to-[var(--surface-2)] border border-[var(--accent)]/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[var(--accent)] tracking-wider">ประมาณการยอดผ่อนชำระต่อเดือน:</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {n} งวด ({years} ปี)
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">฿{num(monthly)}</span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">/เดือน</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-[var(--border)] text-[11px]">
            <div className="p-2 rounded-xl bg-black/30">
              <span className="text-[10px] text-[var(--text-secondary)] block">วงเงินขอกู้:</span>
              <strong className="text-white">฿{num(loan)}</strong>
            </div>
            <div className="p-2 rounded-xl bg-black/30">
              <span className="text-[10px] text-[var(--text-secondary)] block">เงินดาวน์ ({downPct}%):</span>
              <strong className="text-amber-400">฿{num(down)}</strong>
            </div>
            <div className="p-2 rounded-xl bg-black/30">
              <span className="text-[10px] text-[var(--text-secondary)] block">ดอกเบี้ยรวมตลอดสัญญา:</span>
              <strong className="text-rose-400">฿{num(interest)}</strong>
            </div>
            <div className="p-2 rounded-xl bg-black/30">
              <span className="text-[10px] text-[var(--text-secondary)] block">เงินเดือนขั้นต่ำแนะนำ (DSR 40%):</span>
              <strong className="text-emerald-400">฿{num(income)}</strong>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-secondary)] pt-1 border-t border-white/5">
            <span>ยอดเงินชำระรวมตลอดสัญญา (เงินต้น + ดอกเบี้ย):</span>
            <span className="font-extrabold text-white">฿{num(totalPaid)} บาท</span>
          </div>
        </div>
        <div className="space-y-3 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div>
              <span className="text-xs font-bold text-[var(--text-primary)] block">🏛️ มาตรการรัฐ: ลดหย่อนค่าโอน & จดจำนอง 0.01%</span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                {price <= 7e6 ? "ได้รับสิทธิ์ (ราคาอสังหาฯ ไม่เกิน 7 ล้านบาท): ค่าโอน 0.01% + จำนอง 0.01%" : "ไม่ได้รับสิทธิ์ (ราคาเกิน 7 ล้านบาท): ใช้อัตราปกติ ค่าโอน 2% + จำนอง 1%"}
              </span>
            </div>
            <input type="checkbox" checked={relief} onChange={(e) => setRelief(e.target.checked)} aria-label="ใช้มาตรการลดค่าโอน" className="w-5 h-5 accent-[var(--accent)] cursor-pointer" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">ข้อตกลงค่าธรรมเนียมการโอนกรรมสิทธิ์:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
              {[
                { id: "50-50", label: "คนละครึ่ง 50/50", sub: "ภาษีผู้ขายจ่าย" },
                { id: "buyer-transfer", label: "ผู้ซื้อออกค่าโอน", sub: "ภาษีผู้ขายจ่าย" },
                { id: "seller-all", label: "ผู้ขายออกทั้งหมด", sub: "ผู้ซื้อจ่าย 0" },
                { id: "buyer-all", label: "ผู้ซื้อออกทั้งหมด", sub: "ผู้ขายรับเงินสุทธิ" },
              ].map((o) => (
                <button
                  type="button"
                  onClick={() => setSplit(o.id)}
                  className={`p-2 rounded-xl text-center transition-all cursor-pointer ${split === o.id ? "bg-[var(--accent)] text-[var(--bg)] shadow-xs" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
                  key={o.id}
                >
                  <span className="block truncate">{o.label}</span>
                  <span className="block text-[9px] font-normal opacity-85 truncate">{o.sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">ระยะเวลาถือครอง & ทะเบียนบ้านของผู้ขาย:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setHoldYears(2)}
                className={`py-2 px-3 rounded-xl font-bold transition-all text-left cursor-pointer ${holdYears < 5 ? "bg-[var(--surface-2)] text-amber-400 border border-amber-500/50" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
              >
                <span>ถือครองไม่ถึง 5 ปี</span>
                <span className="block text-[10px] font-normal opacity-85">{inHouseReg ? "ยกเว้นธุรกิจเฉพาะ (อากร 0.5%)" : "เสียภาษีธุรกิจเฉพาะ 3.3%"}</span>
              </button>
              <button
                type="button"
                onClick={() => setHoldYears(6)}
                className={`py-2 px-3 rounded-xl font-bold transition-all text-left cursor-pointer ${holdYears >= 5 ? "bg-[var(--surface-2)] text-emerald-400 border border-emerald-500/50" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
              >
                <span>ถือครอง 5 ปีขึ้นไป</span>
                <span className="block text-[10px] font-normal opacity-85">เสียอากรแสตมป์ 0.5%</span>
              </button>
            </div>
            {holdYears < 5 && (
              <label className="flex items-center gap-2 mt-1.5 p-2 rounded-xl bg-[var(--surface-2)] text-[11px] text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={inHouseReg} onChange={(e) => setInHouseReg(e.target.checked)} className="accent-[var(--accent)]" />
                <span>ผู้ขายมีชื่อในทะเบียนบ้านเกิน 1 ปี (ได้รับยกเว้นภาษีธุรกิจเฉพาะ เสียอากร 0.5%)</span>
              </label>
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] block mb-1">ประเภทผู้ขาย (ภาษีเงินได้หัก ณ ที่จ่าย):</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button type="button" onClick={() => setSeller("individual")} className={opt(seller === "individual")}>
                <span>บุคคลธรรมดา</span>
                <span className="block text-[10px] font-normal opacity-85">อัตราก้าวหน้า (~1.5%)</span>
              </button>
              <button type="button" onClick={() => setSeller("corporate")} className={opt(seller === "corporate")}>
                <span>นิติบุคคล (บริษัท)</span>
                <span className="block text-[10px] font-normal opacity-85">ม.69 ตรี (1.0% ตามกฎหมาย)</span>
              </button>
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-[var(--border)] space-y-2.5">
          <span className="font-extrabold text-xs text-[var(--text-primary)] block">รายละเอียดค่าใช้จ่ายวันโอนกรรมสิทธิ์ ณ กรมที่ดิน:</span>
          <div className="space-y-2 text-xs text-[var(--text-secondary)] bg-[var(--surface-2)] p-3.5 rounded-2xl border border-[var(--border)]">
            {[
              { k: `1. ค่าธรรมเนียมการโอนกรรมสิทธิ์ (${reliefOn ? "0.01% มาตรการรัฐ" : "2% ปกติ"}):`, s: `ผู้ซื้อจ่าย ฿${num(buyerFee)} | ผู้ขายจ่าย ฿${num(sellerFee)}`, c: "text-[var(--text-secondary)]", v: fee },
              { k: `2. ค่าจดจำนอง (${reliefOn ? "0.01% มาตรการรัฐ" : "1% ปกติ"} ของยอดกู้):`, s: "ผู้ซื้อเป็นผู้ชำระ", c: "text-blue-400", v: mortgageFee },
              { k: "3. อากรแสตมป์สัญญาเงินกู้ (0.05% ไม่เกิน 10,000 บาท):", s: "ผู้กู้/ผู้ซื้อชำระ", c: "text-blue-400", v: loanStamp },
              { k: `4. ${stampOnly ? "ค่าอากรแสตมป์ (0.5%)" : "ภาษีธุรกิจเฉพาะ (3.3%)"}:`, s: stampOnly ? "ยกเว้นภาษีธุรกิจเฉพาะ (อากร 0.5%)" : "ถือครองไม่เกิน 5 ปี (3.3%)", c: "text-amber-400", v: tax },
              {
                k: `5. ภาษีเงินได้หัก ณ ที่จ่าย (${seller === "corporate" ? "1.0% นิติบุคคล ม.69 ตรี" : "~1.5% บุคคลธรรมดา"}):`,
                s: seller === "corporate" ? "นิติบุคคลหักตามอัตรากำหนด 1%" : "บุคคลธรรมดาตามอัตราก้าวหน้า",
                c: "text-amber-400",
                v: wht,
              },
            ].map((r, i, all) => (
              <div className={`flex justify-between items-center py-1 ${i < all.length - 1 ? "border-b border-[var(--border)]" : ""}`} key={r.k}>
                <div>
                  <span className="font-semibold text-[var(--text-primary)] block">{r.k}</span>
                  <span className={`text-[10px] ${r.c}`}>{r.s}</span>
                </div>
                <span className="font-bold text-[var(--text-primary)]">฿{num(r.v)}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/40 to-[var(--surface-2)] border border-blue-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-blue-400">เงินสดรวมที่ผู้ซื้อต้องเตรียม (Buyer Total Cash)</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">ดาวน์ + วันโอน</span>
              </div>
              <div className="text-xl font-black text-blue-400">฿{num(buyerCash)}</div>
              <div className="text-[10px] text-[var(--text-secondary)] space-y-0.5 pt-1 border-t border-blue-500/20">
                <div className="flex justify-between">
                  <span>• เงินดาวน์ ({downPct}%):</span>
                  <span className="font-bold text-white">฿{num(down)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• ค่าธรรมเนียมวันโอน + จำนอง:</span>
                  <span className="font-bold text-white">฿{num(buyerDay)}</span>
                </div>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-[var(--surface-2)] border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">ค่าใช้จ่ายรวมฝั่งผู้ขาย (Seller Total Cost)</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">ภาษี & ค่าโอน</span>
              </div>
              <div className="text-xl font-black text-amber-400">฿{num(sellerCost)}</div>
              <div className="text-[10px] text-[var(--text-secondary)] space-y-0.5 pt-1 border-t border-amber-500/20">
                <div className="flex justify-between">
                  <span>• ค่าโอนส่วนผู้ขาย:</span>
                  <span className="font-bold text-white">฿{num(sellerFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• ภาษี/อากร + หัก ณ ที่จ่าย:</span>
                  <span className="font-bold text-white">฿{num(sellerTax)}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">*ตัวเลขประมาณการเบื้องต้น อัตราจริงขึ้นกับธนาคาร ราคาประเมิน และประกาศของกรมที่ดิน</p>
        </div>
      </div>
    </div>
  );
}

/** Title-deed and zoning guide (design: Tx "ตรวจโฉนด & ผังเมือง"). */
function DeedGuide() {
  return (
    <div className="mx-4 mt-4 space-y-4">
      <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-3">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
          <FileCheck2 className="w-4 h-4 text-amber-400" />
          <h2 className="font-extrabold text-sm text-[var(--text-primary)]">คู่มือตรวจสอบเอกสารสิทธิ์ & ผังสีเมือง (ทั่วประเทศ)</h2>
        </div>
        <div className="space-y-2.5">
          <span className="text-[11px] font-black uppercase text-[var(--text-secondary)]">1. ประเภทเอกสารสิทธิ์ที่ดินในไทย:</span>
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-black">น.ส. 4 จ. (ครุฑแดง)</span>
                <span className="font-bold text-xs text-white">โฉนดที่ดินกรรมสิทธิ์ 100% (ดีที่สุด)</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">มีระวางภาพถ่ายทางอากาศชัดเจน ซื้อ-ขาย โอนกรรมสิทธิ์ จำนองกับธนาคารได้ทันที ปลอดภัยสูงสุดสำหรับผู้ซื้อ</p>
            </div>
            <div className="p-3 rounded-2xl bg-black/40 border border-amber-500/30 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white">น.ส. 3 ก. (ครุฑเขียว)</span>
                <span className="font-bold text-xs text-white">หนังสือรับรองการทำประโยชน์</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">มีระวางรูปถ่ายทางอากาศแล้ว สามารถซื้อขายและยื่นขอออกเป็นโฉนดครุฑแดงได้ทันทีโดยไม่ต้องรอประกาศ 30 วัน</p>
            </div>
            <div className="p-3 rounded-2xl bg-black/40 border border-rose-500/30 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white">ส.ป.ก. / ภ.บ.ท. 5 (ข้อควรระวัง)</span>
                <span className="font-bold text-xs text-rose-300">ไม่ใช่เอกสารแสดงกรรมสิทธิ์</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">ห้ามทำการซื้อขายเปลี่ยนมือโดยเด็ดขาด ให้สิทธิ์เฉพาะการทำเกษตรกรรมของบุคคลที่ได้รับอนุญาตเท่านั้น</p>
            </div>
          </div>
        </div>
        <div className="pt-3 border-t border-[var(--border)] space-y-2.5">
          <span className="text-[11px] font-black uppercase text-[var(--text-secondary)]">2. ผังสีการใช้ประโยชน์ที่ดินตามผังเมืองรวม:</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <span className="font-extrabold text-yellow-400 block mb-0.5">ผังสีเหลือง</span>
              <p className="text-[10px] text-[var(--text-secondary)]">ที่อยู่อาศัยหนาแน่นน้อย เหมาะสร้างบ้านเดี่ยว วิลล่า</p>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30">
              <span className="font-extrabold text-orange-400 block mb-0.5">ผังสีส้ม</span>
              <p className="text-[10px] text-[var(--text-secondary)]">ที่อยู่อาศัยหนาแน่นปานกลาง ทำคอนโด ทาวน์โฮมได้</p>
            </div>
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
              <span className="font-extrabold text-rose-400 block mb-0.5">ผังสีแดง</span>
              <p className="text-[10px] text-[var(--text-secondary)]">พาณิชยกรรม ศูนย์การค้า สำนักงาน และอาคารสูง</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <span className="font-extrabold text-purple-400 block mb-0.5">ผังสีม่วง</span>
              <p className="text-[10px] text-[var(--text-secondary)]">เขตอุตสาหกรรม คลังสินค้า และโรงงานผลิต</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
