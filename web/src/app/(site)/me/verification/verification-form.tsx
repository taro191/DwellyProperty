"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { VERIFICATION_KIND_LABEL } from "@/lib/constants";
import type { VerificationKind } from "@/lib/types";
import { attachVerificationDoc, createVerificationRequest } from "../actions";

const DOCS: Record<VerificationKind, { type: string; label: string; required: boolean }[]> = {
  identity: [
    { type: "id_card", label: "บัตรประชาชน (ด้านหน้า)", required: true },
    { type: "selfie", label: "รูปถ่ายคู่บัตรประชาชน", required: true },
  ],
  agent_license: [{ type: "license", label: "ใบอนุญาต / บัตรสมาชิกสมาคมนายหน้า", required: true }],
  property_ownership: [
    { type: "deed", label: "สำเนาโฉนด / หนังสือกรรมสิทธิ์ห้องชุด", required: true },
    { type: "id_card", label: "บัตรประชาชนเจ้าของ (ถ้าไม่ได้ยืนยันตัวตนแล้ว)", required: false },
  ],
  company: [{ type: "company_cert", label: "หนังสือรับรองบริษัท (ไม่เกิน 3 เดือน)", required: true }],
};

export function VerificationForm({
  userId, defaultKind, defaultProperty, listings, kycDone,
}: { userId: string; defaultKind: VerificationKind; defaultProperty?: string; listings: { id: string; label: string }[]; kycDone: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<VerificationKind>(kycDone && defaultKind === "identity" ? "property_ownership" : defaultKind);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const files = DOCS[kind].map((d) => ({ ...d, file: fd.get(`file_${d.type}`) as File | null })).filter((d) => d.file && d.file.size > 0);
    const missing = DOCS[kind].find((d) => d.required && !files.some((f) => f.type === d.type));
    if (missing) return setResult({ ok: false, text: `กรุณาแนบ ${missing.label}` });
    if (files.some((f) => f.file!.size > 10 * 1024 * 1024)) return setResult({ ok: false, text: "ไฟล์ต้องไม่เกิน 10MB" });

    setBusy(true);
    setResult(null);
    try {
      // Files go straight to Storage; only text fields go to the server action.
      const fields = new FormData();
      for (const [k, v] of fd.entries()) if (typeof v === "string") fields.append(k, v);
      const created = await createVerificationRequest(fields);
      if (!created.ok) throw new Error(created.error);
      const requestId = created.data!.id;
      const supabase = createClient();
      for (const f of files) {
        const ext = f.file!.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${userId}/${requestId}/${f.type}-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("verification-docs").upload(path, f.file!, { contentType: f.file!.type });
        if (error) throw new Error(`อัปโหลด ${f.label} ไม่สำเร็จ`);
        const attached = await attachVerificationDoc(requestId, f.type, path);
        if (!attached.ok) throw new Error(attached.error);
      }
      form.reset();
      setResult({ ok: true, text: "ส่งคำขอแล้ว ทีมงานจะตรวจสอบภายใน 1–2 วันทำการ" });
      router.refresh();
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="ประเภทการยืนยัน">
        <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value as VerificationKind)}>
          {(Object.keys(VERIFICATION_KIND_LABEL) as VerificationKind[]).map((k) => (
            <option key={k} value={k} disabled={k === "identity" && kycDone}>{VERIFICATION_KIND_LABEL[k]}</option>
          ))}
        </Select>
      </Field>
      {kind === "property_ownership" && (
        <Field label="ประกาศที่ต้องการยืนยัน">
          <Select name="property_id" defaultValue={defaultProperty ?? ""} required>
            <option value="" disabled>เลือกประกาศ</option>
            {listings.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </Select>
        </Field>
      )}
      <Field label="ชื่อ-นามสกุลตามเอกสาร" required><Input name="full_name" required /></Field>
      {kind === "identity" && <Field label="เลขบัตรประชาชน 4 ตัวท้าย"><Input name="doc_number_last4" maxLength={4} inputMode="numeric" /></Field>}
      {kind === "agent_license" && <Field label="เลขที่ใบอนุญาต"><Input name="license_no" /></Field>}
      {kind === "property_ownership" && <Field label="เลขที่โฉนด / ห้องชุด"><Input name="deed_no" /></Field>}

      {DOCS[kind].map((d) => (
        <Field key={d.type} label={d.label} required={d.required} hint="JPG, PNG หรือ PDF ไม่เกิน 10MB">
          <input name={`file_${d.type}`} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
            className="text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-fg" />
        </Field>
      ))}

      <p className="text-xs text-subtle">
        เราใช้เอกสารเพื่อยืนยันตัวตนและกรรมสิทธิ์เท่านั้น เก็บในพื้นที่ปิดที่เข้าถึงได้เฉพาะทีมตรวจสอบ และลบเมื่อพ้นระยะเวลาตามนโยบายความเป็นส่วนตัว
        แนะนำให้ขีดฆ่าและเขียน “ใช้สำหรับยืนยันกับ Dwelly เท่านั้น” บนสำเนา
      </p>
      {result && <Alert tone={result.ok ? "accent" : "danger"}>{result.text}</Alert>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "กำลังส่ง…" : "ส่งคำขอยืนยัน"}</Button>
    </form>
  );
}
