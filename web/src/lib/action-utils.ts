import "server-only";
import type { z } from "zod";
import type { ActionResult } from "@/lib/types";

/** Map database/trigger errors to messages users can act on. */
const KNOWN_ERRORS: [RegExp, string][] = [
  [/Invalid listing status change/, "ไม่สามารถเปลี่ยนสถานะประกาศแบบนี้ได้"],
  [/not accepting requests/, "ประกาศนี้ไม่เปิดรับคำขอแล้ว"],
  [/own listing/, "ไม่สามารถทำรายการกับประกาศของตัวเองได้"],
  [/at least 1 hour/, "กรุณานัดล่วงหน้าอย่างน้อย 1 ชั่วโมง"],
  [/Offer validity/, "ระยะเวลาข้อเสนอต้องอยู่ระหว่าง 1–30 วัน"],
  [/Offer has expired/, "ข้อเสนอนี้หมดอายุแล้ว"],
  [/Counter price is required/, "กรุณาระบุราคาที่ต้องการเสนอกลับ"],
  [/Invalid offer change|Invalid appointment change/, "ไม่สามารถดำเนินการนี้ได้ในสถานะปัจจุบัน"],
  [/review only after/, "รีวิวได้หลังจากนัดชมหรือมีการเสนอราคาแล้วเท่านั้น"],
  [/review yourself/, "ไม่สามารถรีวิวตัวเองได้"],
  [/Only agents/, "เฉพาะบัญชีนายหน้าเท่านั้น"],
  [/Staff permission required/, "คุณไม่มีสิทธิ์ทำรายการนี้"],
  [/reason is required|note is required/, "กรุณาระบุเหตุผล"],
  [/Sign in required/, "กรุณาเข้าสู่ระบบ"],
  [/locked while under review/, "คำขออยู่ระหว่างตรวจสอบ ยังแก้ไขไม่ได้"],
  [/verification_requests_one_open/, "คุณมีคำขอประเภทนี้ที่รอตรวจสอบอยู่แล้ว"],
  [/commission_access_unique/, "คุณส่งคำขอนี้ไปแล้ว"],
  [/duplicate key/, "ข้อมูลนี้มีอยู่แล้ว"],
  [/row-level security/, "คุณไม่มีสิทธิ์ทำรายการนี้ หรือบัญชีถูกระงับ"],
  [/properties_price_matches_type/, "กรุณากรอกราคาให้ตรงกับประเภทประกาศ"],
  [/Activity is full/, "กิจกรรมนี้ที่นั่งเต็มแล้ว"],
  [/Registration closed/, "ปิดรับสมัครแล้ว"],
];

export function dbError(error: { message: string } | null | undefined, fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่"): ActionResult<never> {
  const msg = error?.message ?? "";
  const hit = KNOWN_ERRORS.find(([re]) => re.test(msg));
  if (!hit) console.error("[db]", msg);
  return { ok: false, error: hit ? hit[1] : fallback };
}

export function invalid(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  const first = error.issues[0];
  return { ok: false, error: first ? first.message : "ข้อมูลไม่ถูกต้อง", fieldErrors };
}

/** FormData -> plain object; empty strings become undefined so optional fields validate cleanly. */
export function formObject(fd: FormData): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const key of new Set(fd.keys())) {
    const values = fd.getAll(key).filter((v): v is string => typeof v === "string");
    if (key.endsWith("[]")) out[key.slice(0, -2)] = values.filter(Boolean);
    else out[key] = values[0] === "" ? undefined : values[0];
  }
  return out;
}
