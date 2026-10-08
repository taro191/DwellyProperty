"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Bookmark, Calculator, CalendarCheck, CheckCircle2, ChevronDown, ChevronUp, FilePen, FileText, Heart, MapPin, MessageSquare,
  Share2, ShieldCheck, Sparkles, Video, X,
} from "lucide-react";
import { LineIcon } from "@/components/app/brand-icons";
import { ShareSheet } from "@/components/app/share-sheet";
import { useListingActions } from "@/components/app/use-listing-actions";
import { startChat } from "@/app/(site)/property/actions";
import { landSizeLabel, num } from "@/lib/listing-view";
import type { PropertyDetail } from "./detail";

/** Opens a chat with the seller (server action redirects to the conversation). */
function ChatForm({ propertyId, className, children }: { propertyId: string; className: string; children: React.ReactNode }) {
  return (
    <form action={startChat} className="contents">
      <input type="hidden" name="property_id" value={propertyId} />
      <button className={className}>{children}</button>
    </form>
  );
}

/** Transfer fee & tax estimate at the Land Department (design: Mx calculator). */
function TransferCalculator({ price }: { price: number }) {
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState<"over5" | "under5">("over5");
  const [inHouseReg, setInHouseReg] = useState(false);
  const [relief, setRelief] = useState(true);
  const [seller, setSeller] = useState<"individual" | "corporate">("individual");
  const [split, setSplit] = useState("50-50");

  const reliefOn = relief && price <= 7e6;
  const fee = Math.round(price * (reliefOn ? 1e-4 : 0.02));
  const stampOnly = holding === "over5" || inHouseReg;
  const tax = Math.round(stampOnly ? price * 0.005 : price * 0.033);
  const wht = Math.round(seller === "corporate" ? price * 0.01 : price * 0.015);
  const total = fee + tax + wht;
  let buyerFee = 0, sellerFee = 0, buyerTotal = 0, sellerTotal = 0;
  if (split === "50-50") {
    buyerFee = Math.round(fee / 2);
    sellerFee = fee - buyerFee;
    buyerTotal = buyerFee;
    sellerTotal = sellerFee + tax + wht;
  } else if (split === "buyer-transfer") {
    buyerFee = fee;
    buyerTotal = fee;
    sellerTotal = tax + wht;
  } else if (split === "seller-all") {
    sellerFee = fee;
    sellerTotal = total;
  } else {
    buyerFee = fee;
    buyerTotal = total;
  }
  const opt = (on: boolean) =>
    `py-2 px-3 rounded-xl font-bold transition-all text-left cursor-pointer ${on ? "bg-[var(--accent)] text-[var(--bg)] shadow-xs" : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"}`;

  return (
    <div className="mt-5 p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between cursor-pointer text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-[var(--text-primary)] flex items-center gap-1.5">ประมาณการค่าโอนและภาษี ณ กรมที่ดิน</h4>
            <p className="text-[11px] text-[var(--text-secondary)]">คำนวณค่าธรรมเนียมโอน 2%, ภาษี/อากร, และภาษีหัก ณ ที่จ่าย</p>
          </div>
        </div>
        <span className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-white">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3.5">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div>
              <span className="text-xs font-bold text-[var(--text-primary)] block">🏛️ มาตรการรัฐ: ลดหย่อนค่าธรรมเนียมโอนเหลือ 0.01%</span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                {price <= 7e6 ? "เข้าเกณฑ์ (ราคาไม่เกิน 7 ล้านบาท): ลดค่าโอนจาก 2% เหลือ 0.01%" : "ไม่เข้าเกณฑ์ (ราคาเกิน 7 ล้านบาท): ใช้อัตราปกติ ค่าโอน 2%"}
              </span>
            </div>
            <input
              type="checkbox"
              checked={relief}
              disabled={price > 7e6}
              onChange={(e) => setRelief(e.target.checked)}
              aria-label="ใช้มาตรการลดค่าโอน"
              className="w-5 h-5 accent-[var(--accent)] cursor-pointer"
            />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1.5">ระยะเวลาถือครอง & ทะเบียนบ้านของผู้ขาย</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button type="button" onClick={() => setHolding("over5")} className={opt(holding === "over5")}>
                <span>ถือครองเกิน 5 ปี</span>
                <span className="block text-[10px] font-normal opacity-85">อากรแสตมป์ 0.5%</span>
              </button>
              <button type="button" onClick={() => setHolding("under5")} className={opt(holding === "under5")}>
                <span>ถือครองไม่เกิน 5 ปี</span>
                <span className="block text-[10px] font-normal opacity-85">{inHouseReg ? "ยกเว้นธุรกิจเฉพาะ (อากร 0.5%)" : "ภาษีธุรกิจเฉพาะ 3.3%"}</span>
              </button>
            </div>
            {holding === "under5" && (
              <label className="flex items-center gap-2 mt-2 p-2 rounded-xl bg-[var(--surface-2)] text-[11px] text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={inHouseReg} onChange={(e) => setInHouseReg(e.target.checked)} className="accent-[var(--accent)]" />
                <span>ผู้ขายมีชื่อในทะเบียนบ้านเกิน 1 ปี (ได้รับยกเว้นภาษีธุรกิจเฉพาะ เสียอากร 0.5%)</span>
              </label>
            )}
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1.5">สถานะผู้ขาย (การหักภาษี ณ ที่จ่าย)</span>
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
          <div>
            <span className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1.5">ข้อตกลงการแบ่งจ่ายค่าใช้จ่ายวันโอน</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-bold">
              {[
                { id: "50-50", label: "ค่าโอนคนละครึ่ง", sub: "ภาษีผู้ขายจ่าย" },
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
          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[var(--border)]/60">
              <div>
                <span className="text-[var(--text-secondary)] block">1. ค่าธรรมเนียมการโอน ({reliefOn ? "0.01% มาตรการรัฐ" : "2.0% ปกติ"})</span>
                <span className="text-[10px] text-[var(--accent)]">
                  ผู้ซื้อ: ฿{num(buyerFee)} | ผู้ขาย: ฿{num(sellerFee)}
                </span>
              </div>
              <span className="font-bold text-[var(--text-primary)]">฿{num(fee)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border)]/60">
              <div>
                <span className="text-[var(--text-secondary)] block">2. {stampOnly ? "ค่าอากรแสตมป์ (0.5%)" : "ภาษีธุรกิจเฉพาะ (3.3%)"}</span>
                <span className="text-[10px] text-amber-400">{stampOnly ? "ยกเว้นภาษีธุรกิจเฉพาะ" : "ถือครองไม่เกิน 5 ปี"}</span>
              </div>
              <span className="font-bold text-[var(--text-primary)]">฿{num(tax)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border)]/60">
              <div>
                <span className="text-[var(--text-secondary)] block">3. ภาษีหัก ณ ที่จ่าย ({seller === "corporate" ? "1.0% นิติบุคคล" : "~1.5% บุคคลธรรมดา"})</span>
                <span className="text-[10px] text-amber-400">ผู้ขายเป็นผู้ชำระ</span>
              </div>
              <span className="font-bold text-[var(--text-primary)]">฿{num(wht)}</span>
            </div>
            <div className="flex justify-between pt-1 font-bold">
              <span className="text-[var(--text-secondary)]">รวมค่าใช้จ่ายทั้งหมด ณ กรมที่ดิน</span>
              <span className="text-[var(--text-primary)]">฿{num(total)} บาท</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30">
              <p className="text-[10px] font-bold uppercase text-blue-400">ฝั่งผู้ซื้อเตรียม (Buyer)</p>
              <p className="text-base font-black text-blue-400 mt-1">฿{num(buyerTotal)}</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                {split === "50-50" ? `ค่าโอนส่วนผู้ซื้อ (฿${num(buyerFee)})` : split === "buyer-transfer" ? "ค่าโอนกรรมสิทธิ์ 100%" : split === "seller-all" ? "ผู้ขายออกให้ทั้งหมด" : "ออกทั้งหมดรวมภาษี"}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-[10px] font-bold uppercase text-amber-400">ฝั่งผู้ขายเตรียม (Seller)</p>
              <p className="text-base font-black text-amber-400 mt-1">฿{num(sellerTotal)}</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                {split === "buyer-all" ? "ผู้ซื้อออกให้ทั้งหมด" : split === "seller-all" ? "ออกค่าโอน + ภาษีทั้งหมด" : "ค่าโอนส่วนผู้ขาย + ภาษี/อากร"}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">*ตัวเลขประมาณการเบื้องต้น อัตราจริงขึ้นกับราคาประเมินและประกาศของกรมที่ดิน</p>
        </div>
      )}
    </div>
  );
}

/** "ต้องการทำอะไรต่อ?" sheet (design: `Px`). */
function InterestSheet({ d, onClose, isSaved, onToggleSave }: { d: PropertyDetail; onClose: () => void; isSaved: boolean; onToggleSave: () => void }) {
  const base = `/property/${d.view.code}`;
  const row = (highlight?: boolean) =>
    `w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left border transition-all ${highlight ? "bg-[var(--accent)]/10 border-[var(--accent)]/40 text-[var(--accent)]" : "bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--accent)]/40 text-[var(--text-primary)]"}`;
  const icon = (highlight?: boolean) =>
    `w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${highlight ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "bg-[var(--surface)] text-[var(--text-primary)]"}`;
  const body = (label: string, sub: string) => (
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm leading-tight">{label}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{sub}</p>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-6 pb-safe pt-5 bg-[var(--surface)] border-t border-[var(--border)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border)] mx-auto -ml-0" />
          <button type="button" onClick={onClose} className="p-1 rounded-full text-[var(--text-secondary)] hover:text-white bg-[var(--surface-2)]" aria-label="ปิด">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-5">
          <h3 className="font-bold text-lg text-[var(--text-primary)]">ต้องการทำอะไรต่อ?</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {d.view.name} • ฿{num(d.view.price)}
          </p>
        </div>
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto no-scrollbar">
          <ChatForm propertyId={d.view.id} className={row()}>
            <div className={icon()}>
              <FileText className="w-5 h-5" />
            </div>
            {body("ขอรายละเอียดเพิ่มเติม", "เราจะส่งคำขอให้ผู้ขายที่ผ่านการยืนยัน")}
          </ChatForm>
          <Link href={`${base}/appointment`} className={row()}>
            <div className={icon()}>
              <CalendarCheck className="w-5 h-5" />
            </div>
            {body("ตรวจสอบสถานะและนัดหมาย", "ยืนยันวันเข้าอยู่และช่วงเวลาตรวจห้อง")}
          </Link>
          <Link href={`${base}/offer`} className={row()}>
            <div className={icon()}>
              <FilePen className="w-5 h-5" />
            </div>
            {body("ขอรับหรือยื่นข้อเสนอ", "รับหรือส่งข้อเสนอราคาอย่างเป็นทางการพร้อมเงื่อนไข")}
          </Link>
          <Link href={`${base}/appointment?format=video`} className={row()}>
            <div className={icon()}>
              <Video className="w-5 h-5" />
            </div>
            {body("จองวิดีโอพาชมทรัพย์", "นัดชมทรัพย์ออนไลน์สดกับเจ้าของหรือนายหน้า")}
          </Link>
          <ChatForm propertyId={d.view.id} className={row()}>
            <div className={icon()}>
              <MessageSquare className="w-5 h-5" />
            </div>
            {body("สอบถามผู้ขายโดยตรง", "เริ่มสนทนากับผู้ขายผ่านแชต Dwelly")}
          </ChatForm>
          <button
            type="button"
            onClick={() => {
              onToggleSave();
              onClose();
            }}
            className={row(isSaved)}
          >
            <div className={icon(isSaved)}>
              <Bookmark className="w-5 h-5" />
            </div>
            {body(isSaved ? "บันทึกในรายการโปรดแล้ว" : "บันทึกไว้ดูภายหลัง", isSaved ? "แตะเพื่อนำออกจากรายการที่บันทึก" : "เก็บทรัพย์นี้ไว้ในรายการโปรดของคุณ")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Property detail (design: `Mx`, screen "property-detail"). */
export function PropertyScreen({ d }: { d: PropertyDetail }) {
  const router = useRouter();
  const s = d.view;
  const actions = useListingActions(d.saved ? [s.id] : [], d.signedIn);
  const saved = actions.isSaved(s.id);
  const [showMatch, setShowMatch] = useState(false);
  const [interest, setInterest] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [slide, setSlide] = useState(0);
  const land = s.land;
  const perUnit = land ? `฿${num(land.pricePerSqWa)} / ตร.ว.` : `฿${num(s.size > 0 ? Math.round(s.price / s.size) : 0)} / ตร.ม.`;
  const investor = d.viewerRole === "investor";
  const back = () => (window.history.length > 1 ? router.back() : router.push("/"));
  const toggle = () => actions.toggleSave(s.id);
  const actionBtn = "py-3 px-1.5 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]/40 flex flex-col items-center gap-1 transition-colors cursor-pointer w-full";

  return (
    <div className="min-h-screen min-h-[100dvh] pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] bg-[var(--bg)]">
      <div className="relative h-72 sm:h-80 overflow-hidden bg-[var(--surface-2)]">
        <div
          className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
          onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {d.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src + i} src={src} alt={`${s.name} ${i + 1}`} className="w-full h-full object-cover shrink-0 snap-center" loading={i === 0 ? "eager" : "lazy"} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
        <div className="absolute top-[calc(1rem+env(safe-area-inset-top,0px))] left-4 right-4 flex items-center justify-between z-20">
          <button type="button" onClick={back} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/60 hover:bg-black text-white backdrop-blur-md transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggle} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/60 hover:bg-black text-white backdrop-blur-md transition-colors" aria-label="Save" aria-pressed={saved}>
              <Heart className={`w-5 h-5 transition-colors ${saved ? "fill-[var(--accent)] text-[var(--accent)]" : "text-white"}`} />
            </button>
            <button type="button" onClick={() => setSharing(true)} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/60 hover:bg-black text-white backdrop-blur-md transition-colors relative" aria-label="Share">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2 z-10 pointer-events-none">
          <div className="flex flex-wrap gap-2">
            {land && <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-black shadow-md flex items-center gap-1">🏞️ แปลงที่ดิน (Land Parcel)</span>}
            {s.isBoosted && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]/40 backdrop-blur-md flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Featured Dwelly Unit
              </span>
            )}
          </div>
          {d.images.length > 1 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white shrink-0">
              {slide + 1}/{d.images.length}
            </span>
          )}
        </div>
      </div>
      <div className="px-4 pt-5">
        {d.isMine && d.status !== "active" && (
          <div className={`mb-4 p-3 rounded-2xl text-xs border ${d.status === "rejected" ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-amber-500/10 border-amber-500/30 text-amber-300"}`}>
            สถานะประกาศ: <b>{d.statusLabel}</b>
            {d.rejectionReason && <> — {d.rejectionReason}</>}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-extrabold text-xl sm:text-2xl text-[var(--text-primary)] leading-tight">{s.name}</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
              {s.location}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-black text-2xl text-[var(--text-primary)]">
              ฿{num(s.price)}
              {s.listingType === "rent" && <span className="text-xs font-bold text-[var(--text-secondary)]">/ด.</span>}
            </p>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              {s.listingType === "sale_or_rent" && s.rentPrice ? `เช่า ฿${num(s.rentPrice)}/ด.` : s.listingType === "rent" ? `${s.size} ตร.ม.` : perUnit}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {land && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              📜 {land.deedType || "เอกสารสิทธิ์ที่ดิน"}
            </span>
          )}
          {s.verified && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/25">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Listing
            </span>
          )}
          {investor && d.yieldPct != null && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              📈 Rental Yield (ค่าเช่า/ราคาขาย) ~{d.yieldPct}% ต่อปี
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowMatch(!showMatch)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/25 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {s.matchScore}% Match{showMatch ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        {showMatch && (
          <div className="mt-3.5 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--accent)]/30">
            <p className="text-xs font-bold text-[var(--accent)] mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              วิเคราะห์คุณภาพและความน่าเชื่อถือของประกาศ
            </p>
            <div className="flex flex-col gap-2">
              {d.matchFactors.map((f) => (
                <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] text-xs" key={f.label}>
                  <span className="text-[var(--text-primary)] font-medium">{f.label}</span>
                  <span className="px-2 py-0.5 rounded-full font-bold bg-[var(--accent)]/10 text-[var(--accent)]">{f.score}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] mt-3 leading-relaxed">*คะแนน Match คำนวณจากการตรวจสอบกรรมสิทธิ์ รูปภาพ รายละเอียด พิกัด และสิ่งอำนวยความสะดวกของประกาศ</p>
          </div>
        )}
        {d.commission && (
          <div className="mt-4 p-4 rounded-3xl bg-gradient-to-br from-[#122b1c] to-[var(--surface)] border border-[var(--accent)]/40 shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center font-black shrink-0">⚡</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-black text-xs text-[var(--text-primary)]">Dwelly Dynamic Commission Active</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30">
                      {d.commission.via === "dwelly" ? "✓ ได้รับอนุญาตจาก Dwelly Property" : "✓ ประกาศของคุณ"}
                    </span>
                  </div>
                  {d.commission.rate != null && <p className="text-[10px] text-[var(--accent)] font-semibold mt-0.5">อัตราคอมมิชชั่น {d.commission.rate}%</p>}
                </div>
              </div>
              <Link href="/dashboard/agent" className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] text-[11px] font-bold hover:brightness-110 shadow-xs shrink-0 cursor-pointer">
                ดูสิทธิ์ & อัตรา
              </Link>
            </div>
          </div>
        )}
        {d.contact.isAgent && (
          <div className="mt-3 p-4 rounded-3xl bg-gradient-to-br from-[#102419] to-[var(--surface)] border border-emerald-500/40 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                {d.contact.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.contact.avatar} alt={d.contact.name} className="w-10 h-10 rounded-2xl object-cover border border-emerald-500/40 shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-emerald-500/40 flex items-center justify-center font-black text-emerald-400">{d.contact.name.charAt(0)}</div>
                )}
                {d.contact.kyc && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[9px] font-black shadow">✓</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-xs text-[var(--text-primary)] truncate">{d.contact.name}</span>
                  {d.contact.agentCode && <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/15">{d.contact.agentCode}</span>}
                </div>
                <p className="text-[10px] text-emerald-400 font-semibold mt-0.5 truncate">
                  {[
                    d.contact.kyc && "✓ ยืนยันตัวตน KYC",
                    d.contact.licenseVerified && "บัตรนายหน้า",
                    `${d.contact.closedDeals} ปิดการขาย`,
                    d.contact.ratingCount > 0 && `(${d.contact.rating.toFixed(2)} ★)`,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
                {d.pod && <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">🛡️ ดูแลโดย {d.pod.name} · Trust score {d.pod.trust}</p>}
              </div>
            </div>
          </div>
        )}
        {d.isMine && (
          <div className="mt-3 p-4 rounded-3xl bg-gradient-to-br from-[#0c222e] via-[var(--surface)] to-[#0c1a24] border border-sky-500/40 shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-sky-400 flex items-center gap-1">🤝 OWNER COLLABORATION</span>
                <p className="font-extrabold text-xs text-[var(--text-primary)] mt-0.5">จัดการประกาศและนายหน้าสำหรับทรัพย์นี้</p>
                <p className="text-[11px] text-[var(--text-secondary)]">แก้ไขประกาศ ดูผู้สนใจ นัดหมาย ข้อเสนอ และค่าคอมมิชชั่น</p>
              </div>
              <Link href={`/dashboard/listings/${s.id}`} className="px-3 py-1.5 rounded-xl bg-sky-400 text-black font-extrabold text-xs hover:bg-sky-300 transition-colors shadow shrink-0 cursor-pointer">
                เปิด Hub
              </Link>
            </div>
          </div>
        )}
        <div className="mt-5 p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
              {land ? "🏞️ ข้อมูลแปลงที่ดินและเอกสารสิทธิ์ (Land Specifications)" : "ข้อมูลทรัพย์สินและรายละเอียด"}
            </p>
            {land && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">โฉนดพร้อมโอนกรรมสิทธิ์</span>}
          </div>
          {land ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-4">
                {[
                  { label: "ขนาดเนื้อที่ดิน (ไร่-งาน-ตร.ว.)", value: landSizeLabel(land), cls: "font-extrabold" },
                  { label: "เนื้อที่รวม (ตารางวา / ตร.ม.)", value: `${num(land.totalSqWa)} ตร.ว. (${num(land.totalSqWa * 4)} ตร.ม.)`, cls: "font-extrabold text-[var(--accent)]" },
                  { label: "ราคาเฉลี่ยต่อตารางวา", value: `฿${num(land.pricePerSqWa)} / ตร.ว.`, cls: "font-extrabold" },
                  { label: "เอกสารสิทธิ์ที่ดิน", value: land.deedType || "-", cls: "font-bold text-amber-400" },
                  { label: "ผังเมือง / สีผัง", value: land.zoning || "-", cls: "font-bold" },
                  { label: "หน้ากว้างติดถนน", value: land.roadFrontage ? `ประมาณ ${land.roadFrontage} เมตร` : "-", cls: "font-bold" },
                  { label: "ประเภทถนนทางเข้าออก", value: d.land?.roadType || "-", cls: "font-medium" },
                  { label: "รูปทรงแปลงที่ดิน", value: d.land?.shape || "-", cls: "font-medium" },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{f.label}</p>
                    <p className={`text-sm mt-0.5 ${f.cls} ${f.cls.includes("text-") ? "" : "text-[var(--text-primary)]"}`}>{f.value}</p>
                  </div>
                ))}
              </div>
              {d.land && d.land.utilities.length > 0 && (
                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] mb-1.5">สาธารณูปโภค & สภาพแปลงที่ดิน:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.land.utilities.map((u) => (
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" key={u}>
                        ✓ {u}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {d.land && d.land.suitableFor.length > 0 && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] mb-1.5">เหมาะสำหรับการพัฒนา:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.land.suitableFor.map((u) => (
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)]" key={u}>
                        ★ {u}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-y-3.5 gap-x-4">
              {d.specs.map((f) => (
                <div key={f.label}>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{f.label}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          )}
          {d.rentTerms.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] mb-1.5">เงื่อนไขการเช่า:</p>
              <div className="flex flex-wrap gap-1.5">
                {d.rentTerms.map((t) => (
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/25" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        {d.description && (
          <div className="mt-4 p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] mb-2">รายละเอียดเพิ่มเติม</p>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">{d.description}</p>
          </div>
        )}
        {s.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {s.tags.map((t) => (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]" key={t}>
                {t}
              </span>
            ))}
          </div>
        )}
        {d.salePrice != null && s.listingType !== "rent" && <TransferCalculator price={d.salePrice} />}
        <div className="mt-5 rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]">
          <div className="h-40 flex flex-col items-center justify-center relative p-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] mb-2">
              <MapPin className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-[var(--text-primary)]">พิกัดทำเล {s.location}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{d.address}</p>
            <Link
              href={`/map?focus=${s.code}`}
              className="mt-3 px-4 py-1.5 rounded-xl text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20 transition-all"
            >
              ดูใน Dwelly Map
            </Link>
          </div>
        </div>
        <div className="mt-5 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center gap-3.5">
            {d.contact.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.contact.avatar} alt={d.contact.name} className="w-12 h-12 rounded-2xl object-cover border border-[var(--border)]" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center font-black text-lg text-[var(--accent)]">
                {d.contact.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                {d.contact.name} ({d.contact.isAgent ? d.contact.company || "นายหน้า" : "เจ้าของทรัพย์"})
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-secondary)]">
                {d.contact.kyc ? (
                  <span className="text-[var(--success)] font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    ยืนยันตัวตนแล้ว
                  </span>
                ) : (
                  <span>ยังไม่ยืนยันตัวตน</span>
                )}
                <span>•</span>
                <span>รหัสประกาศ {s.code}</span>
              </div>
            </div>
          </div>
        </div>
        {!d.isMine && (
          <div className="mt-5 grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSharing(true)}
              className="py-3 px-1.5 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex flex-col items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
              title="แชร์เข้า LINE ทันที"
            >
              <LineIcon className="w-4 h-4 fill-emerald-400" />
              <span className="truncate">แชร์ LINE</span>
            </button>
            <ChatForm propertyId={s.id} className={actionBtn}>
              <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
              <span className="truncate">แชทผู้ขาย</span>
            </ChatForm>
            <Link href={`/property/${s.code}/appointment`} className={actionBtn}>
              <Video className="w-4 h-4 text-[var(--accent)]" />
              <span className="truncate">นัดดู/Call</span>
            </Link>
            <Link href={`/property/${s.code}/offer`} className={actionBtn}>
              <FilePen className="w-4 h-4 text-[var(--accent)]" />
              <span className="truncate">ยื่นข้อเสนอ</span>
            </Link>
          </div>
        )}
        {!d.isMine && (
          <Link href={`/property/${s.code}/report`} className="mt-4 block text-center text-[11px] text-[var(--text-secondary)] hover:text-rose-300">
            แจ้งประกาศไม่เหมาะสม / สงสัยมิจฉาชีพ
          </Link>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-[var(--bg)] border-t border-[var(--border)] z-30 flex items-center gap-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={toggle}
          className={`px-3.5 py-3 rounded-2xl border transition-colors flex items-center justify-center cursor-pointer ${saved ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"}`}
          aria-label="Save Property"
          aria-pressed={saved}
        >
          <Heart className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => setSharing(true)}
          className="px-3.5 py-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          title="แชร์เข้า LINE / สรุปดีล"
        >
          <LineIcon className="w-5 h-5 fill-emerald-400" />
          <span className="text-xs font-bold">แชร์</span>
        </button>
        {d.isMine ? (
          <Link
            href={`/dashboard/listings/${s.id}`}
            className="flex-1 py-3 rounded-2xl font-bold text-sm bg-[var(--accent)] text-[var(--bg)] shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 text-center"
          >
            จัดการประกาศของคุณ
          </Link>
        ) : d.accepting ? (
          <button
            type="button"
            onClick={() => (d.signedIn ? setInterest(true) : router.push(`/login?next=/property/${s.code}`))}
            className="flex-1 py-3 rounded-2xl font-bold text-sm bg-[var(--accent)] text-[var(--bg)] shadow-lg shadow-[var(--accent)]/20 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            สนใจยูนิตนี้
          </button>
        ) : (
          <span className="flex-1 py-3 rounded-2xl font-bold text-sm bg-[var(--surface-2)] text-[var(--text-secondary)] text-center">ปิดรับการติดต่อแล้ว</span>
        )}
      </div>
      {interest && <InterestSheet d={d} onClose={() => setInterest(false)} isSaved={saved} onToggleSave={toggle} />}
      {sharing && <ShareSheet property={s} onClose={() => setSharing(false)} />}
    </div>
  );
}
