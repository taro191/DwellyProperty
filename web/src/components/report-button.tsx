"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { Card, Select, Textarea } from "@/components/ui";
import { REPORT_REASON_LABEL } from "@/lib/constants";
import type { ReportTarget } from "@/lib/types";
import { submitReport } from "@/app/(site)/property/actions";

export function ReportButton({ targetType, targetId, signedIn }: { targetType: ReportTarget; targetId: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 py-2 text-xs text-subtle hover:text-red-300">
        <Flag className="h-3.5 w-3.5" /> แจ้งประกาศไม่เหมาะสม / สงสัยมิจฉาชีพ
      </button>
    );
  }
  if (!signedIn) {
    return (
      <Card className="p-4 text-sm">
        กรุณา <Link href="/login" className="text-accent underline">เข้าสู่ระบบ</Link> เพื่อแจ้งปัญหา
      </Card>
    );
  }
  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-semibold">แจ้งปัญหาให้ทีมงานตรวจสอบ</p>
      <ActionForm action={submitReport} className="space-y-3" resetOnSuccess>
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_id" value={targetId} />
        <Select name="reason" required defaultValue="">
          <option value="" disabled>เลือกเหตุผล</option>
          {Object.entries(REPORT_REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <FieldError name="reason" />
        <Textarea name="details" placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)" className="min-h-20" />
        <SubmitButton variant="danger" className="w-full" pendingText="กำลังส่ง…">ส่งรายงาน</SubmitButton>
      </ActionForm>
    </Card>
  );
}
