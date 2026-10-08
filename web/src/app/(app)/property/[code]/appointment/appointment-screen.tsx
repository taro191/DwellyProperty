"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Compass, House, Phone, Video } from "lucide-react";
import { requestAppointment, startChat } from "@/app/(site)/property/actions";
import { num } from "@/lib/listing-view";

type Format = "onsite" | "video" | "phone";
const ROOM = [
  { id: "video" as Format, icon: Video, label: "Live Video Walkthrough", sub: "ดูห้องสดผ่านวิดีโอคอลกับเจ้าของหรือนายหน้า" },
  { id: "onsite" as Format, icon: House, label: "On-site Inspection (ดูห้องจริง)", sub: "นัดหมายเจ้าหน้าที่พาชมสถานที่จริง" },
  { id: "phone" as Format, icon: Phone, label: "Phone Consultation", sub: "โทรปรึกษาข้อมูลรายละเอียดกับตัวแทน" },
];
const LAND = [
  { id: "onsite" as Format, icon: Compass, label: "พาสำรวจแปลงที่ดิน & ตรวจหลักหมุด", sub: "นัดหมายเจ้าของ/ตัวแทน พาเดินสำรวจแนวเขตและทางสาธารณะจริง" },
  { id: "video" as Format, icon: Video, label: "Live Drone / Video Walkthrough", sub: "ดูมุมสูงโดรนและสภาพแวดล้อมรอบแปลงสดๆ ผ่านวิดีโอคอล" },
  { id: "phone" as Format, icon: Phone, label: "ปรึกษาผังเมือง & เอกสารสิทธิ์", sub: "โทรสนทนาเงื่อนไขราคา ค่าโอน และข้อกำหนดการใช้ประโยชน์" },
];
const SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export type AppointmentProps = {
  property: { id: string; code: string; name: string; price: number; image: string; isLand: boolean; seller: string };
  days: { date: string; label: string }[];
  initialFormat: Format;
};

/** Schedule a viewing (design: `lm`, screen "appointment"). */
export function AppointmentScreen({ property: p, days, initialFormat }: AppointmentProps) {
  const router = useRouter();
  const options = p.isLand ? LAND : ROOM;
  const [format, setFormat] = useState<Format>(initialFormat);
  const [day, setDay] = useState(0);
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("property_id", p.id);
      fd.set("format", format);
      fd.set("date", days[day].date);
      fd.set("time", time);
      if (note.trim()) fd.set("buyer_note", note.trim());
      const r = await requestAppointment(fd);
      if (r.ok) setDone(true);
      else setError(r.error);
    });

  if (done) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-[var(--bg)]">
        <div className="w-20 h-20 rounded-3xl bg-[var(--success)]/15 border border-[var(--success)]/30 flex items-center justify-center text-[var(--success)] mb-5 shadow-2xl">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="font-extrabold text-2xl text-[var(--text-primary)]">ส่งคำขอนัดหมายเรียบร้อยแล้ว!</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs">ระบบแจ้งผู้ขายแล้ว คุณจะได้รับการแจ้งเตือนเมื่อผู้ขายยืนยันนัด ติดตามได้ที่ Dwelly Pass ของคุณ</p>
        <div className="w-full mt-6 p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] text-left shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] mb-3">ข้อมูลการนัดหมาย</p>
          <div className="flex flex-col gap-2.5 text-xs">
            {[
              ["อสังหาฯ", p.name],
              ["ผู้ขาย/ผู้ดูแล", p.seller],
              ["รูปแบบ", options.find((o) => o.id === format)?.label ?? ""],
            ].map(([k, v]) => (
              <div className="flex justify-between gap-3 py-1.5 border-b border-[var(--border)]" key={k}>
                <span className="text-[var(--text-secondary)] shrink-0">{k}</span>
                <span className="font-bold text-[var(--text-primary)] truncate max-w-[200px]">{v}</span>
              </div>
            ))}
            <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">วันเวลา</span>
              <span className="font-bold text-[var(--accent)]">
                {days[day].label} เวลา {time} น.
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[var(--text-secondary)]">สถานะ</span>
              <span className="font-bold text-amber-400">รอผู้ขายยืนยัน</span>
            </div>
          </div>
        </div>
        <div className="w-full flex gap-3 mt-6">
          <form action={startChat} className="flex-1">
            <input type="hidden" name="property_id" value={p.id} />
            <button className="w-full py-3.5 rounded-2xl font-bold text-xs border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]">เปิดแชทกับผู้ขาย</button>
          </form>
          <Link href={`/property/${p.code}`} className="flex-1 py-3.5 rounded-2xl font-bold text-xs bg-[var(--accent)] text-[var(--bg)] shadow-md text-center">
            กลับสู่หน้ารายการ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] bg-[var(--bg)]">
      <div className="flex items-center gap-3 px-4 min-h-14 pt-[env(safe-area-inset-top,0px)] bg-[var(--surface)] border-b border-[var(--border)]">
        <button type="button" onClick={() => router.push(`/property/${p.code}`)} className="p-1 -ml-1 text-[var(--text-secondary)] hover:text-white cursor-pointer" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">{p.isLand ? "นัดหมายสำรวจแปลงที่ดิน (Land Survey)" : "นัดหมายดูห้อง (Schedule Visit)"}</h2>
      </div>
      <div className="px-4 pt-4 flex flex-col gap-5">
        <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">{p.name}</h3>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {p.seller} • ฿{num(p.price)}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">1. เลือกรูปแบบการนัดหมาย</p>
          <div className="flex flex-col gap-2.5">
            {options.map((o) => {
              const Icon = o.icon;
              const on = format === o.id;
              return (
                <button
                  type="button"
                  onClick={() => setFormat(o.id)}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-all ${on ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] shadow-sm" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)]"}`}
                  key={o.id}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${on ? "bg-[var(--accent)]/20" : "bg-[var(--surface-2)]"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm leading-tight">{o.label}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{o.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">2. เลือกวันที่ต้องการ</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {days.map((d, i) => (
              <button
                type="button"
                onClick={() => setDay(i)}
                className={`flex-shrink-0 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${day === i ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
                key={d.date}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">3. เลือกช่วงเวลา</p>
          <div className="grid grid-cols-4 gap-2">
            {SLOTS.map((t) => (
              <button
                type="button"
                onClick={() => setTime(t)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${time === t ? "bg-[var(--accent)] text-[var(--bg)] shadow-md" : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/40"}`}
                key={t}
              >
                {t} น.
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">4. ข้อความถึงผู้ขาย (ไม่บังคับ)</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="เช่น ขอดูห้องจริงช่วงบ่าย, มีคำถามเรื่องค่าส่วนกลาง"
            className="w-full px-4 py-3 rounded-2xl bg-[var(--surface)] text-sm text-[var(--text-primary)] border border-[var(--border)] focus:border-[var(--accent)] outline-none resize-none"
          />
        </div>
        {error && <p className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">{error}</p>}
      </div>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-[var(--bg)] border-t border-[var(--border)] z-30">
        <button
          type="button"
          disabled={!time || pending}
          onClick={submit}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${time ? "bg-[var(--accent)] text-[var(--bg)] shadow-lg shadow-[var(--accent)]/20 hover:opacity-90" : "bg-[var(--surface-2)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"}`}
        >
          {pending ? "กำลังส่ง…" : "ยืนยันการนัดหมาย"}
        </button>
      </div>
    </div>
  );
}
