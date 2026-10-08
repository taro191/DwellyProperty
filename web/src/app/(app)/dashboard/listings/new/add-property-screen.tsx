"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, ChevronRight, ImagePlus, Info } from "lucide-react";
import { createListing } from "@/app/(site)/dashboard/listings/actions";
import { CATEGORY_LABEL, DIRECTION_LABEL, FURNISHING_LABEL } from "@/lib/constants";
import { num } from "@/lib/listing-view";
import type { Furnishing, ListingType, PropertyCategory } from "@/lib/types";

const PURPOSE: { id: ListingType; label: string }[] = [
  { id: "sale", label: "ขาย" },
  { id: "rent", label: "ให้เช่า" },
  { id: "sale_or_rent", label: "ขาย & ให้เช่า" },
];
const DEEDS = ["โฉนดที่ดิน (น.ส. 4 จ. ครุฑแดง)", "น.ส. 3 ก. (ครุฑเขียว)", "น.ส. 3 (ครุฑดำ)", "อื่นๆ"];
const ZONING = ["ผังสีเหลือง (ที่อยู่อาศัยหนาแน่นน้อย)", "ผังสีส้ม (ที่อยู่อาศัยหนาแน่นปานกลาง)", "ผังสีแดง (พาณิชยกรรม)", "ผังสีเขียว (ชนบทและเกษตรกรรม)", "ผังสีม่วง (อุตสาหกรรม)", "ไม่ทราบ"];
const FILL = ["ถมแล้วระดับเสมอถนน", "ถมบางส่วน", "ยังไม่ถม"];
const FIELD_STEP: Record<string, number> = {
  title: 0, category: 0, listing_type: 0, province: 0, district: 0, description: 0,
  usable_area_sqm: 1, land_area_sqwa: 1, bedrooms: 1, bathrooms: 1, floor: 1, deed_type: 1, zoning: 1, road_frontage_m: 1,
  sale_price: 3, rent_price: 3, maintenance_fee: 3,
};
const input = "w-full px-4 py-3 rounded-2xl bg-[var(--surface)] text-sm text-[var(--text-primary)] border border-[var(--border)] focus:border-[var(--accent)] outline-none";
const label = "block text-xs font-bold text-[var(--text-secondary)] mb-1.5";
const chip = (on: boolean) =>
  `py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${on ? "bg-[var(--accent)] text-[var(--bg)] shadow-sm" : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"}`;

/** Add a listing, step by step (design: `em`, screen "add-property"). Saves a draft, then photos are added. */
export function AddPropertyScreen({ provinces }: { provinces: string[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    title: "", category: "condo" as PropertyCategory, listing_type: "sale" as ListingType, province: provinces[0], district: "", description: "",
    usable_area_sqm: "", bedrooms: "1", bathrooms: "1", floor: "", direction: "", furnishing: "full" as Furnishing | "",
    rai: "0", ngan: "0", sqwa: "", deed_type: DEEDS[0], zoning: ZONING[1], road_frontage_m: "", road_type: "", fill: FILL[0],
    sale_price: "", rent_price: "", maintenance_fee: "", price_negotiable: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const land = f.category === "land";
  const steps = land ? ["ข้อมูลพื้นฐาน", "รายละเอียดที่ดิน", "รูปภาพ", "ราคาและดีล", "ตรวจสอบ"] : ["ข้อมูลพื้นฐาน", "รายละเอียดทรัพย์", "รูปภาพ", "ราคาและดีล", "ตรวจสอบ"];
  const totalSqwa = (Number(f.rai) || 0) * 400 + (Number(f.ngan) || 0) * 100 + (Number(f.sqwa) || 0);
  const sells = f.listing_type !== "rent";
  const rents = f.listing_type !== "sale";
  const canNext =
    step === 0
      ? f.title.trim().length >= 10 && f.province
      : step === 1
        ? land
          ? totalSqwa > 0
          : Number(f.usable_area_sqm) > 0
        : step === 3
          ? (!sells || Number(f.sale_price) > 0) && (!rents || Number(f.rent_price) > 0)
          : true;

  const submit = () =>
    startTransition(async () => {
      const fd = new FormData();
      const put = (k: string, v: string | undefined | null) => v != null && String(v).trim() !== "" && fd.set(k, String(v).trim());
      put("title", f.title);
      put("category", f.category);
      put("listing_type", f.listing_type);
      put("province", f.province);
      put("district", f.district);
      put("description", f.description);
      if (land) {
        put("land_area_sqwa", String(totalSqwa));
        put("deed_type", f.deed_type);
        put("zoning", f.zoning);
        put("road_frontage_m", f.road_frontage_m);
        put("tags", [f.road_type, f.fill].filter(Boolean).join(", "));
      } else {
        put("usable_area_sqm", f.usable_area_sqm);
        put("bedrooms", f.bedrooms);
        put("bathrooms", f.bathrooms);
        put("floor", f.floor);
        put("direction", f.direction);
        put("furnishing", f.furnishing);
      }
      if (sells) put("sale_price", f.sale_price);
      if (rents) put("rent_price", f.rent_price);
      put("maintenance_fee", f.maintenance_fee);
      if (f.price_negotiable) fd.set("price_negotiable", "on");
      const r = await createListing(fd); // redirects to the listing's photo step on success
      if (r && !r.ok) {
        const fe = Object.fromEntries(Object.entries(r.fieldErrors ?? {}).map(([k, v]) => [k, v[0]]));
        setErrors(Object.keys(fe).length ? fe : { _: r.error });
        const first = Object.keys(fe).map((k) => FIELD_STEP[k]).filter((x) => x != null).sort()[0];
        if (first != null) setStep(first);
      }
    });
  const err = (k: string) => (errors[k] ? <p className="mt-1 text-[11px] text-rose-400">{errors[k]}</p> : null);

  return (
    <div className="min-h-screen min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] bg-[var(--bg)]">
      <div className="flex items-center gap-3 px-4 min-h-14 pt-[env(safe-area-inset-top,0px)] bg-[var(--surface)] border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => (step > 0 ? setStep(step - 1) : router.push("/dashboard"))}
          className="p-1 -ml-1 text-[var(--text-secondary)] hover:text-white cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">ลงประกาศอสังหาฯ ขาย/ให้เช่า</h2>
      </div>
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5 mb-2">
          {steps.map((p, i) => (
            <div className="flex-1" key={p}>
              <div className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-[var(--accent)]" : "bg-[var(--surface-2)]"}`} />
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[var(--accent)]">
            ขั้นตอน {step + 1}: {steps[step]}
          </span>
          <span className="text-[var(--text-secondary)]">
            {step + 1} จาก {steps.length}
          </span>
        </div>
      </div>
      <div className="px-4 mt-3 flex flex-col gap-4">
        {errors._ && <p className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">{errors._}</p>}
        {step === 0 && (
          <>
            <div>
              <span className={label}>ชื่อประกาศ / ชื่อโครงการ * (อย่างน้อย 10 ตัวอักษร)</span>
              <input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={150} placeholder="เช่น คอนโด Aspire ศาลายา 1 ห้องนอน ใกล้ ม.มหิดล" className={input} />
              {err("title")}
            </div>
            <div>
              <span className="block text-xs font-bold text-[var(--text-secondary)] mb-2">ประเภทอสังหาริมทรัพย์ *</span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(CATEGORY_LABEL) as PropertyCategory[]).map((c) => (
                  <button type="button" onClick={() => set("category", c)} className={chip(f.category === c)} key={c}>
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-xs font-bold text-[var(--text-secondary)] mb-2">วัตถุประสงค์ *</span>
              <div className="flex gap-2">
                {PURPOSE.map((p) => (
                  <button type="button" onClick={() => set("listing_type", p.id)} className={`flex-1 ${chip(f.listing_type === p.id)} font-bold`} key={p.id}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className={label}>จังหวัด *</span>
                <select value={f.province} onChange={(e) => set("province", e.target.value)} className={input}>
                  {provinces.map((p) => (
                    <option value={p} key={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={label}>อำเภอ / เขต / ทำเล</span>
                <input value={f.district} onChange={(e) => set("district", e.target.value)} maxLength={80} placeholder="เช่น พุทธมณฑล" className={input} />
              </label>
            </div>
            <label>
              <span className={label}>รายละเอียดเพิ่มเติม</span>
              <textarea
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                maxLength={10000}
                placeholder="จุดเด่น ทำเล การเดินทาง สิ่งอำนวยความสะดวก"
                className={`${input} resize-none`}
              />
            </label>
          </>
        )}
        {step === 1 && land && (
          <>
            <div>
              <span className="block text-xs font-bold text-[var(--text-secondary)] mb-2">ขนาดเนื้อที่ดินตามโฉนด *</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["rai", "ไร่"],
                    ["ngan", "งาน"],
                    ["sqwa", "ตร.ว."],
                  ] as const
                ).map(([k, u]) => (
                  <label className="relative" key={k}>
                    <input type="number" inputMode="numeric" min={0} value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder="0" className={`${input} pr-12`} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]">{u}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--accent)] font-bold">รวม {num(totalSqwa)} ตร.ว. ({num(totalSqwa * 4)} ตร.ม.)</p>
              {err("land_area_sqwa")}
            </div>
            <label>
              <span className={label}>ประเภทเอกสารสิทธิ์ที่ดิน *</span>
              <select value={f.deed_type} onChange={(e) => set("deed_type", e.target.value)} className={input}>
                {DEEDS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={label}>สีผังเมือง (การใช้ประโยชน์ที่ดิน)</span>
              <select value={f.zoning} onChange={(e) => set("zoning", e.target.value)} className={input}>
                {ZONING.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className={label}>หน้ากว้างติดถนน (เมตร)</span>
                <input type="number" min={0} value={f.road_frontage_m} onChange={(e) => set("road_frontage_m", e.target.value)} placeholder="เช่น 30" className={input} />
              </label>
              <label>
                <span className={label}>สภาพการถมที่ดิน</span>
                <select value={f.fill} onChange={(e) => set("fill", e.target.value)} className={input}>
                  {FILL.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span className={label}>ประเภทถนนทางเข้าออก</span>
              <input value={f.road_type} onChange={(e) => set("road_type", e.target.value)} maxLength={60} placeholder="เช่น ถนนคอนกรีตสาธารณะ กว้าง 8 ม." className={input} />
            </label>
          </>
        )}
        {step === 1 && !land && (
          <>
            <label>
              <span className={label}>ขนาดพื้นที่ใช้สอย (ตร.ม.) *</span>
              <input type="number" inputMode="numeric" min={1} value={f.usable_area_sqm} onChange={(e) => set("usable_area_sqm", e.target.value)} placeholder="32" className={input} />
              {err("usable_area_sqm")}
            </label>
            <div>
              <span className="block text-xs font-bold text-[var(--text-secondary)] mb-2">จำนวนห้องนอน *</span>
              <div className="grid grid-cols-5 gap-2">
                {["0", "1", "2", "3", "4"].map((b) => (
                  <button type="button" onClick={() => set("bedrooms", b)} className={chip(f.bedrooms === b)} key={b}>
                    {b === "0" ? "Studio" : b === "4" ? "4+" : b}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className={label}>ห้องน้ำ</span>
                <input type="number" min={0} max={50} value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} className={input} />
              </label>
              <label>
                <span className={label}>ชั้นที่อยู่</span>
                <input type="number" min={-5} max={200} value={f.floor} onChange={(e) => set("floor", e.target.value)} placeholder="8" className={input} />
              </label>
            </div>
            <label>
              <span className={label}>ทิศระเบียง / หน้าบ้าน</span>
              <select value={f.direction} onChange={(e) => set("direction", e.target.value)} className={input}>
                <option value="">ไม่ระบุ</option>
                {Object.entries(DIRECTION_LABEL).map(([k, v]) => (
                  <option value={k} key={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="block text-xs font-bold text-[var(--text-secondary)] mb-2">สภาพเฟอร์นิเจอร์</span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(FURNISHING_LABEL) as Furnishing[]).map((k) => (
                  <button type="button" onClick={() => set("furnishing", k)} className={chip(f.furnishing === k)} key={k}>
                    {FURNISHING_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <div className="p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] mx-auto">
              <ImagePlus className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-sm text-[var(--text-primary)]">อัปโหลดรูปภาพจริงของทรัพย์</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              หลังกดบันทึกในขั้นสุดท้าย ระบบจะพาไปหน้าจัดการประกาศเพื่ออัปโหลดรูป (JPG/PNG/WebP) เลือกรูปปก และจัดลำดับ ก่อนส่งให้ทีมงานตรวจสอบ
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-[var(--text-secondary)]">
              {["ภาพรวมห้อง/ตัวบ้าน", "วิวและส่วนกลาง", "เอกสาร/แปลน (ถ้ามี)"].map((t) => (
                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-dashed border-[var(--border)] flex flex-col items-center gap-1" key={t}>
                  <Camera className="w-4 h-4" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <>
            {sells && (
              <label>
                <span className={label}>ราคาขายสุทธิ (บาท) *</span>
                <input type="number" inputMode="numeric" min={1} value={f.sale_price} onChange={(e) => set("sale_price", e.target.value)} placeholder="2,350,000" className={`${input} font-black`} />
                {land && totalSqwa > 0 && Number(f.sale_price) > 0 && (
                  <p className="mt-1 text-[11px] text-amber-400 font-bold">เฉลี่ย ฿{num(Math.round(Number(f.sale_price) / totalSqwa))} / ตร.ว.</p>
                )}
                {err("sale_price")}
              </label>
            )}
            {rents && (
              <label>
                <span className={label}>ราคาปล่อยเช่า (บาท/เดือน) *</span>
                <input type="number" inputMode="numeric" min={1} value={f.rent_price} onChange={(e) => set("rent_price", e.target.value)} placeholder="8,500" className={`${input} font-black`} />
                {err("rent_price")}
              </label>
            )}
            {!land && (
              <label>
                <span className={label}>ค่าส่วนกลาง (บาท/เดือน)</span>
                <input type="number" min={0} value={f.maintenance_fee} onChange={(e) => set("maintenance_fee", e.target.value)} placeholder="1,500" className={input} />
              </label>
            )}
            <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] cursor-pointer">
              <span className="text-xs">
                <span className="font-bold text-[var(--text-primary)] block">ราคาต่อรองได้</span>
                <span className="text-[var(--text-secondary)]">แสดงป้าย &quot;ต่อรองได้&quot; ให้ผู้ซื้อยื่นข้อเสนอ</span>
              </span>
              <input type="checkbox" checked={f.price_negotiable} onChange={(e) => set("price_negotiable", e.target.checked)} className="w-5 h-5 accent-[var(--accent)]" />
            </label>
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#12281a] to-[var(--surface)] border border-[var(--accent)]/30 text-xs text-[var(--text-secondary)] flex gap-2">
              <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>เปิดระบบคอมมิชชั่น Co-Agent และแต่งตั้งนายหน้าได้ในหน้าจัดการประกาศ หลังบันทึก</span>
            </div>
          </>
        )}
        {step === 4 && (
          <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)]">
            <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">สรุปข้อมูลการลงประกาศ</h3>
            <div className="flex flex-col gap-2 text-xs">
              {[
                ["ชื่อประกาศ", f.title],
                ["ประเภท", `${CATEGORY_LABEL[f.category]} • ${PURPOSE.find((p) => p.id === f.listing_type)?.label}`],
                ["ทำเล", [f.district, f.province].filter(Boolean).join(", ")],
                land ? ["ขนาดที่ดิน", `${num(totalSqwa)} ตร.ว. • ${f.deed_type}`] : ["ขนาด", `${f.usable_area_sqm} ตร.ม. • ${f.bedrooms === "0" ? "Studio" : `${f.bedrooms} ห้องนอน`}`],
                sells ? ["ราคาขาย", `฿${num(Number(f.sale_price) || 0)}`] : null,
                rents ? ["ค่าเช่า", `฿${num(Number(f.rent_price) || 0)}/เดือน`] : null,
              ]
                .filter((x): x is string[] => Boolean(x))
                .map(([k, v]) => (
                  <div className="flex justify-between gap-3 py-1.5 border-b border-[var(--border)]" key={k}>
                    <span className="text-[var(--text-secondary)] shrink-0">{k}</span>
                    <span className="font-bold text-[var(--text-primary)] text-right">{v}</span>
                  </div>
                ))}
            </div>
            <p className="mt-3 text-[11px] text-[var(--text-secondary)] flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
              ประกาศจะถูกบันทึกเป็นแบบร่าง เพิ่มรูปแล้วกด &quot;ส่งตรวจ&quot; เพื่อให้ทีมงานตรวจสอบก่อนเผยแพร่
            </p>
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-[var(--bg)] border-t border-[var(--border)] z-30">
        {step === steps.length - 1 ? (
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all bg-[var(--accent)] text-[var(--bg)] shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "กำลังบันทึก…" : "บันทึกและไปเพิ่มรูปภาพ →"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-1.5 ${canNext ? "bg-[var(--accent)] text-[var(--bg)] shadow-lg shadow-[var(--accent)]/20 hover:opacity-90" : "bg-[var(--surface-2)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"}`}
          >
            ถัดไป <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
