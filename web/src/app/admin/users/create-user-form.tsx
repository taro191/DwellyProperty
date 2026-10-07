import { Field, Input, Select } from "@/components/ui";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { ROLE_LABEL, STAFF_ROLE_LABEL } from "@/lib/constants";
import type { AppRole, StaffRole } from "@/lib/types";
import { createUser } from "../actions";

/** Super-admin form: create an account and (optionally) grant an admin role. */
export function CreateUserForm() {
  return (
    <details className="mb-5 rounded-3xl border border-line bg-surface p-5 open:pb-6">
      <summary className="cursor-pointer select-none font-bold">+ เพิ่มผู้ใช้ใหม่</summary>
      <ActionForm action={createUser} className="mt-4 grid gap-4 sm:grid-cols-2" resetOnSuccess>
        <Field label="อีเมล" required>
          <Input name="email" type="email" required autoComplete="off" />
          <FieldError name="email" />
        </Field>
        <Field label="ชื่อที่แสดง">
          <Input name="name" maxLength={80} autoComplete="off" />
        </Field>
        <Field label="รหัสผ่าน (ไม่บังคับ)" hint="เว้นว่างได้ — ผู้ใช้จะล็อกอินด้วยรหัส OTP ทางอีเมล">
          <Input name="password" type="password" minLength={8} autoComplete="new-password" />
          <FieldError name="password" />
        </Field>
        <Field label="สิทธิ์ admin">
          <Select name="staff_role" defaultValue="none">
            <option value="none">ไม่มี (ผู้ใช้ทั่วไป)</option>
            {(Object.keys(STAFF_ROLE_LABEL) as StaffRole[]).map((r) => (
              <option key={r} value={r}>{STAFF_ROLE_LABEL[r]}</option>
            ))}
          </Select>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-xs font-semibold text-muted">บทบาทผู้ใช้ (ไม่บังคับ)</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ROLE_LABEL) as AppRole[]).filter((r) => r !== "buyer").map((r) => (
              <label key={r} className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm">
                <input type="checkbox" name="app_roles[]" value={r} className="accent-emerald-500" />
                {ROLE_LABEL[r]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2">
          <SubmitButton>สร้างผู้ใช้</SubmitButton>
        </div>
      </ActionForm>
    </details>
  );
}
