import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Flag } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { ActionForm, FieldError, SubmitButton } from "@/components/ui/form";
import { REPORT_REASON_LABEL } from "@/lib/constants";
import { submitReport } from "@/app/(site)/property/actions";
import { loadPropertyDetail } from "../detail";

export const metadata: Metadata = { title: "แจ้งปัญหาประกาศ" };

/** Report a listing (not in the prototype; styled like its sub-screens). */
export default async function ReportPage({ params }: PageProps<"/property/[code]/report">) {
  const { code } = await params;
  if (!(await getViewer())) redirect(`/login?next=/property/${code}/report`);
  const d = await loadPropertyDetail(code);
  if (!d) notFound();
  const field = "w-full px-4 py-3 rounded-2xl bg-[var(--surface)] text-sm text-[var(--text-primary)] border border-[var(--border)] focus:border-[var(--accent)] outline-none";
  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <div className="flex items-center gap-3 px-4 min-h-14 pt-[env(safe-area-inset-top,0px)] bg-[var(--surface)] border-b border-[var(--border)]">
        <Link href={`/property/${d.view.code}`} className="p-1 -ml-1 text-[var(--text-secondary)] hover:text-white" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="font-bold text-sm text-[var(--text-primary)] truncate">แจ้งปัญหาให้ทีมงานตรวจสอบ</h2>
      </div>
      <div className="px-4 pt-4 space-y-4">
        <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-[var(--text-primary)] truncate">{d.view.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">รหัสประกาศ {d.view.code} · ทีมงานจะตรวจสอบภายใน 24 ชม.</p>
          </div>
        </div>
        <ActionForm action={submitReport} className="space-y-3" resetOnSuccess>
          <input type="hidden" name="target_type" value="property" />
          <input type="hidden" name="target_id" value={d.view.id} />
          <select name="reason" required defaultValue="" className={field} aria-label="เหตุผล">
            <option value="" disabled>เลือกเหตุผล</option>
            {Object.entries(REPORT_REASON_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <FieldError name="reason" />
          <textarea name="details" rows={4} maxLength={2000} placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)" className={`${field} resize-none`} />
          <SubmitButton variant="danger" className="w-full" pendingText="กำลังส่ง…">ส่งรายงาน</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
