"use client";

import { useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { Field, Input, cn } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/constants";
import type { AppRole } from "@/lib/types";
import { completeOnboarding } from "./actions";

const ROLE_HINT: Record<AppRole, string> = {
  buyer: "หาซื้อคอนโด บ้าน ที่ดิน",
  tenant: "หาที่พักให้เช่า",
  owner: "ลงประกาศขาย/ให้เช่าทรัพย์ของตัวเอง",
  investor: "หาทรัพย์ผลตอบแทนสูง",
  agent: "รับฝากขาย และทำงาน Co-Agent",
};

export function WelcomeForm({
  next, defaults,
}: {
  next: string;
  defaults: { display_name: string; primary_role: AppRole; roles: AppRole[]; phone: string; line_id: string };
}) {
  const [primary, setPrimary] = useState<AppRole>(defaults.primary_role);

  return (
    <ActionForm action={completeOnboarding} className="mt-6 space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field label="ชื่อที่แสดง" required>
        <Input name="display_name" defaultValue={defaults.display_name} required maxLength={80} />
        <FieldError name="display_name" />
      </Field>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-muted">คุณใช้ Dwelly เพื่อ… (เลือกบทบาทหลัก)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
            <label
              key={r}
              className={cn(
                "cursor-pointer rounded-2xl border p-3 transition-colors",
                primary === r ? "border-accent bg-accent/10" : "border-line bg-surface-2 hover:border-accent/50",
              )}
            >
              <input type="radio" name="primary_role" value={r} checked={primary === r} onChange={() => setPrimary(r)} className="sr-only" />
              <span className="block text-sm font-semibold">{ROLE_LABEL[r]}</span>
              <span className="block text-xs text-subtle">{ROLE_HINT[r]}</span>
            </label>
          ))}
        </div>
        <FieldError name="primary_role" />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-muted">บทบาทอื่นที่เกี่ยวข้อง (ไม่บังคับ)</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ROLE_LABEL) as AppRole[]).filter((r) => r !== primary).map((r) => (
            <label key={r} className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm">
              <input type="checkbox" name="roles[]" value={r} defaultChecked={defaults.roles.includes(r)} className="accent-emerald-500" />
              {ROLE_LABEL[r]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="เบอร์โทรศัพท์" hint="แสดงให้ผู้ที่ติดต่อทรัพย์ของคุณเท่านั้น">
          <Input name="phone" type="tel" defaultValue={defaults.phone} placeholder="08x-xxx-xxxx" />
          <FieldError name="phone" />
        </Field>
        <Field label="LINE ID">
          <Input name="line_id" defaultValue={defaults.line_id} />
        </Field>
      </div>

      <div className="space-y-2 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
        <label className="flex gap-3">
          <input type="checkbox" name="accept_terms" required className="mt-1 accent-emerald-500" />
          <span>
            ฉันยอมรับ <a href="/legal/terms" target="_blank" className="text-accent underline">ข้อกำหนดการใช้งาน</a> และ{" "}
            <a href="/legal/privacy" target="_blank" className="text-accent underline">นโยบายความเป็นส่วนตัว</a> (จำเป็น)
          </span>
        </label>
        <FieldError name="accept_terms" />
        <label className="flex gap-3 text-muted">
          <input type="checkbox" name="marketing" className="mt-1 accent-emerald-500" />
          <span>ยินยอมรับข่าวสาร โปรโมชัน และทรัพย์แนะนำ (ไม่บังคับ ยกเลิกได้ทุกเมื่อ)</span>
        </label>
      </div>

      <SubmitButton className="w-full" size="lg">เริ่มใช้งาน</SubmitButton>
    </ActionForm>
  );
}
