import type { LucideIcon } from "lucide-react";
import { Flame, GraduationCap, Handshake, KeyRound, Sparkles, Tag, Target, Trees, TrendingUp, Trophy } from "lucide-react";

/** Presentation for each Dwelly Zone, keyed by zones.slug (design: `qn` / `Hn`). */
export interface ZoneMeta {
  icon: LucideIcon;
  accentColor: string;
  bgTint: string;
  borderTint: string;
  badgeText: string;
  tagline: string;
  thaiName: string;
  subDescription: string;
  landmarks: string[];
  priceRange: string;
  coverImage: string;
  highlights: string[];
}

export const ZONE_META: Record<string, ZoneMeta> = {
  land: {
    icon: Trees,
    accentColor: "text-amber-400",
    bgTint: "bg-amber-500/10",
    borderTint: "border-amber-500/30",
    badgeText: "HOT DWELLY ZONE",
    tagline: "แปลงที่ดินทำเลทอง โฉนดครุฑแดง น.ส. 4 จ. ริมน้ำ & ถนนหลัก",
    thaiName: "โซนที่ดินแปลงศักยภาพ & โฉนดพร้อมโอน",
    subDescription: "คัดสรรที่ดินแปลงสวย เหมาะสร้างบ้านพักตากอากาศ ทำโฮมออฟฟิศ คาเฟ่ริมน้ำ หรือลงทุนเก็งกำไรระยะยาวในทำเลศาลายา-พุทธมณฑล",
    landmarks: ["ริมคลองทวีวัฒนา", "ถนนบรมราชชนนี", "ใกล้มหาวิทยาลัยมหิดล"],
    priceRange: "฿3.2M - ฿45M (เริ่มต้น ฿20,000/ตร.ว.)",
    coverImage: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80",
    highlights: ["โฉนดครุฑแดง 100%", "ติดถนนสาธารณะ", "สาธารณูปโภคน้ำไฟเข้าถึง", "ตรวจสอบผังเมืองแล้ว"],
  },
  "near-mahidol": {
    icon: GraduationCap,
    accentColor: "text-sky-400",
    bgTint: "bg-sky-500/10",
    borderTint: "border-sky-500/30",
    badgeText: "CAMPUS LIFE",
    tagline: "ระยะเดินหรือนั่งชัตเติลบัสถึง ม.มหิดล ศาลายา ใน 5-10 นาที",
    thaiName: "โซนใกล้มหาวิทยาลัยมหิดล (Campus Zone)",
    subDescription: "คอนโดและหอพักใกล้ประตูมหาวิทยาลัย ตอบโจทย์นักศึกษา อาจารย์ และบุคลากรทางการแพทย์ เดินทางสะดวก ปลอดภัย มีรถรับส่ง",
    landmarks: ["ม.มหิดล ประตู 4-5", "หอประชุมมหิดลสิทธาคาร", "ตลาดศาลายา"],
    priceRange: "฿1.45M - ฿2.45M",
    coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000&q=80",
    highlights: ["เดินถึงมหาวิทยาลัย", "รถตู้ชัตเติลบัสผ่าน", "มีร้านอาหารและคาเฟ่ 24 ชม.", "รักษาความปลอดภัยเข้มงวด"],
  },
  "move-in-ready": {
    icon: KeyRound,
    accentColor: "text-emerald-400",
    bgTint: "bg-emerald-500/10",
    borderTint: "border-emerald-500/30",
    badgeText: "FAST MOVE-IN",
    tagline: "ตกแต่งครบ เฟอร์นิเจอร์-เครื่องใช้ไฟฟ้าพร้อมกระเป๋าใบเดียวเข้าอยู่ได้ทันที",
    thaiName: "โซนพร้อมเข้าอยู่ทันที (Move-in Ready)",
    subDescription: "ตรวจเช็กสภาพห้องเรียบร้อย ตกแต่งบิวท์อิน เครื่องปรับอากาศ เครื่องซักผ้า และสมาร์ททีวีพร้อมโอนกรรมสิทธิ์และย้ายเข้าได้เลย",
    landmarks: ["คอนโดพร้อมโอน", "ตรวจรับห้องแล้ว", "สถานีรถไฟศาลายา"],
    priceRange: "฿1.65M - ฿3.2M",
    coverImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&q=80",
    highlights: ["ฟูลลี่เฟอร์นิเจอร์", "เครื่องใช้ไฟฟ้าครบ", "ไม่ต้องรีโนเวทเพิ่ม", "พร้อมนัดตรวจห้องจริง"],
  },
  investment: {
    icon: TrendingUp,
    accentColor: "text-purple-400",
    bgTint: "bg-purple-500/10",
    borderTint: "border-purple-500/30",
    badgeText: "HIGH YIELD",
    tagline: "อัตราผลตอบแทนค่าเช่าเฉลี่ย 6.5% - 8.2% ผู้เช่ากลุ่มนักศึกษาและแพทย์แน่นตลอดปี",
    thaiName: "โซนเพื่อการลงทุน Yield สูง (Investment Hub)",
    subDescription: "วิเคราะห์อัตราการเช่าสูงต่อเนื่อง (High Occupancy Rate) พร้อมสัญญาผู้เช่าเดิม มีทีมช่วยจัดหาผู้เช่าเข้าพอร์ตต่อเนื่อง",
    landmarks: ["ศูนย์การแพทย์กาญจนาภิเษก", "วิทยาลัยดุริยางคศิลป์", "เซ็นทรัล ศาลายา"],
    priceRange: "฿1.85M - ฿3.8M (Yield 6.8% - 8.5%)",
    coverImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&q=80",
    highlights: ["Rental Yield 7%+", "มีผู้เช่าพร้อมสัญญา", "กระแสเงินสดบวก", "มีบริการบริหารพอร์ต"],
  },
  "under-2m": {
    icon: Tag,
    accentColor: "text-cyan-400",
    bgTint: "bg-cyan-500/10",
    borderTint: "border-cyan-500/30",
    badgeText: "BUDGET FRIENDLY",
    tagline: "งบประหยัด ผ่อนเริ่มต้นเพียงเดือนละ 6,500 - 9,500 บาท คุ้มกว่าจ่ายค่าเช่ารายเดือน",
    thaiName: "โซนราคาจับต้องได้ ไม่เกิน 2 ล้าน (Affordable)",
    subDescription: "คอนโดราคาคุ้มค่า ผ่อนสบาย เหมาะสำหรับผู้เริ่มต้นทำงานหรือซื้อเป็นทรัพย์สินหลังแรก กู้ได้เต็ม 100% ดอกเบี้ยพิเศษ",
    landmarks: ["แนวรถไฟฟ้าสายสีแดงอ่อน", "พุทธมณฑลสาย 4", "แม็คโคร ศาลายา"],
    priceRange: "฿1.29M - ฿1.99M",
    coverImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1000&q=80",
    highlights: ["ผ่อนเบา 7,xxx/เดือน", "กู้ได้เต็ม 100%", "ฟรีค่าโอนในงาน", "ดูแลสินเชื่อฟรี"],
  },
  "owner-direct": {
    icon: Handshake,
    accentColor: "text-teal-400",
    bgTint: "bg-teal-500/10",
    borderTint: "border-teal-500/30",
    badgeText: "DIRECT DEAL",
    tagline: "เจรจาตรงกับเจ้าของกรรมสิทธิ์ ไม่มีบวกค่านายหน้าซ่อนเร้น นัดตรวจเอกสารโฉนดได้ทันที",
    thaiName: "โซนคุยตรงกับเจ้าของห้อง (Owner Direct)",
    subDescription: "ดีลจริงจากเจ้าของห้องโดยตรง ไม่มีค่าคอมมิชชั่นแอบแฝง ต่อรองราคาและเงื่อนไขการโอนได้ยืดหยุ่น พร้อมใบมอบอำนาจถูกต้อง",
    landmarks: ["ตรวจสอบกรรมสิทธิ์ 100%", "สัญญามาตรฐาน สคบ.", "นัดพบผู้ขาย"],
    priceRange: "฿1.45M - ฿5.2M",
    coverImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&q=80",
    highlights: ["เจรจากับเจ้าของตรง", "ไม่มีบวกราคาเพิ่ม", "ต่อรองเงื่อนไขได้", "โฉนดพร้อมแสดง"],
  },
  "pod-picks": {
    icon: Trophy,
    accentColor: "text-rose-400",
    bgTint: "bg-rose-500/10",
    borderTint: "border-rose-500/30",
    badgeText: "CERTIFIED PODS",
    tagline: "คัดสรรและดูแลนิติกรรมโดย Dwelly Agency Pod มีวงเงินประกันคุ้มครองธุรกรรม 10 ล้านบาท",
    thaiName: "โซนคัดเกรดพิเศษโดย Dwelly Agency Pod",
    subDescription: "ยูนิตที่ผ่านการตรวจสภาพ 24 รายการโดยเอเจนซี่พาร์ทเนอร์มืออาชีพ มีทีมงานพาชม ช่วยยื่นสินเชื่อ และดูแลการโอนกรรมสิทธิ์ครบวงจร",
    landmarks: ["Salaya Prime Estate Pod", "TREBA Licensed Broker", "Escrow Account"],
    priceRange: "฿1.95M - ฿14M",
    coverImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=80",
    highlights: ["ตรวจสภาพ 24 จุด", "ประกันคุ้มครองธุรกรรม", "ที่ปรึกษาสินเชื่อดูแล", "มีทีมพาชมทุกวัน"],
  },
  "new-today": {
    icon: Flame,
    accentColor: "text-amber-500",
    bgTint: "bg-amber-500/15",
    borderTint: "border-amber-500/40",
    badgeText: "JUST LISTED",
    tagline: "ยูนิตและแปลงที่ดินเข้าใหม่ในรอบ 24 ชั่วโมง สิทธิ์จองในงานราคาก่อนเปิดขายทั่วไป",
    thaiName: "โซนประกาศใหม่ประจำวัน (New Today)",
    subDescription: "อสังหาฯ ที่เพิ่งลงประกาศวันนี้ หลุดจองราคาดี หรือห้องสภาพใหม่เอี่ยมที่เพิ่งเปิดขายในตลาดศาลายา",
    landmarks: ["อัปเดตล่าสุดวันนี้", "ดีลราคาพิเศษประจำวัน", "สิทธิ์ก่อนใคร"],
    priceRange: "฿1.65M - ฿6.5M",
    coverImage: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&q=80",
    highlights: ["อัปเดตสดใน 24 ชม.", "ยังไม่มีคนแย่งจอง", "ห้องสภาพมือหนึ่ง", "สิทธิ์รับส่วนลดด่วน"],
  },
  "smart-picks": {
    icon: Target,
    accentColor: "text-indigo-400",
    bgTint: "bg-indigo-500/10",
    borderTint: "border-indigo-500/30",
    badgeText: "SMART PICKS",
    tagline: "คัดสรรพิเศษตามความนิยมและไลฟ์สไตล์ผู้ค้นหาในงาน Dwelly",
    thaiName: "โซนคัดยอดนิยม (Dwelly Recommended)",
    subDescription: "รวมโครงการและยูนิตที่มีคนกดเซฟและนัดชมห้องมากที่สุดในสัปดาห์นี้ ทำเลดี ปล่อยเช่าง่าย ขายต่อคล่อง",
    landmarks: ["Top Viewed & Saved", "ทำเลตอบโจทย์", "ห้องสเปกตรงใจ"],
    priceRange: "฿1.75M - ฿3.5M",
    coverImage: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1000&q=80",
    highlights: ["เรตติ้งผู้เข้าชมสูงสุด", "วิวสระว่ายน้ำ/สวน", "ที่จอดรถสะดวก", "ค่าส่วนกลางเหมาะสม"],
  },
};

export const ZONE_FALLBACK: ZoneMeta = {
  icon: Sparkles,
  accentColor: "text-[var(--accent)]",
  bgTint: "bg-[var(--accent)]/10",
  borderTint: "border-[var(--accent)]/30",
  badgeText: "DWELLY ZONE",
  tagline: "โซนพิเศษในโครงการ Salaya Used Condo & Land Dwelly Hub",
  thaiName: "โซนพิเศษ Dwelly Hub",
  subDescription: "สำรวจคอลเลกชันอสังหาฯ ทำเลศาลายา-พุทธมณฑล ที่ผ่านการคัดสรรคุณภาพ",
  landmarks: ["ทำเลศาลายา", "เดินทางสะดวก", "ใกล้สิ่งอำนวยความสะดวก"],
  priceRange: "฿1.5M - ฿5.0M",
  coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000&q=80",
  highlights: ["คุณภาพผ่านการคัดสรร", "เดินทางสะดวก", "เอกสารพร้อมโอน"],
};
