import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { latestConsents, openDeletionRequest } from "@/server/services/account";
import { Alert, Card, Field, Input, PageHeader, Textarea, buttonClass } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { formatDateTime } from "@/lib/format";
import { cancelAccountDeletion, requestAccountDeletion, setMarketingConsent } from "../actions";

export const metadata: Metadata = { title: "ความเป็นส่วนตัว (PDPA)" };

export default async function PrivacyPage() {
  const viewer = await requireViewer("/me/privacy");
  const [latest, deletion] = await Promise.all([latestConsents(viewer), openDeletionRequest(viewer)]);
  const marketing = latest.marketing?.granted ?? false;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="ความเป็นส่วนตัว (PDPA)" subtitle="จัดการความยินยอมและสิทธิของเจ้าของข้อมูลส่วนบุคคล" />

      <Card className="space-y-3 p-5">
        <h2 className="font-bold">ความยินยอม</h2>
        <ul className="space-y-1 text-sm text-muted">
          <li>ข้อกำหนดการใช้งาน: {latest.terms ? `ยอมรับเมื่อ ${formatDateTime(latest.terms.created_at)}` : "—"}</li>
          <li>นโยบายความเป็นส่วนตัว: {latest.privacy ? `ยอมรับเมื่อ ${formatDateTime(latest.privacy.created_at)}` : "—"}</li>
        </ul>
        <ActionForm action={setMarketingConsent} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4">
          <div className="text-sm">
            <p className="font-semibold">รับข่าวสารและทรัพย์แนะนำ</p>
            <p className="text-subtle">สถานะ: {marketing ? "ยินยอม" : "ไม่ยินยอม"}</p>
          </div>
          <input type="hidden" name="granted" value={marketing ? "false" : "true"} />
          <SubmitButton size="sm" variant={marketing ? "secondary" : "primary"}>{marketing ? "ถอนความยินยอม" : "ให้ความยินยอม"}</SubmitButton>
        </ActionForm>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-bold">ขอสำเนาข้อมูลของฉัน</h2>
        <p className="text-sm text-subtle">ดาวน์โหลดข้อมูลทั้งหมดที่ Dwelly เก็บเกี่ยวกับคุณในรูปแบบ JSON</p>
        <a href="/me/privacy/export" className={buttonClass("secondary", "sm")}>ดาวน์โหลดข้อมูล (JSON)</a>
      </Card>

      <Card className="space-y-3 border-danger/40 p-5">
        <h2 className="font-bold text-red-300">ลบบัญชี</h2>
        {deletion ? (
          <>
            <Alert tone="warning">ส่งคำขอลบบัญชีเมื่อ {formatDateTime(deletion.requested_at)} — อยู่ระหว่างดำเนินการ</Alert>
            {deletion.status === "pending" && (
              <ActionForm action={cancelAccountDeletion}>
                <SubmitButton size="sm" variant="secondary">ยกเลิกคำขอ</SubmitButton>
              </ActionForm>
            )}
          </>
        ) : (
          <ActionForm action={requestAccountDeletion} className="space-y-3">
            <p className="text-sm text-subtle">
              ประกาศ แชท และข้อมูลส่วนตัวจะถูกลบหรือทำให้ไม่สามารถระบุตัวตนได้ ยกเว้นข้อมูลที่กฎหมายกำหนดให้เก็บ (เช่น ใบกำกับภาษี)
            </p>
            <Field label="เหตุผล (ไม่บังคับ)"><Textarea name="reason" className="min-h-20" /></Field>
            <Field label='พิมพ์ "ลบบัญชี" เพื่อยืนยัน'><Input name="confirm" autoComplete="off" /></Field>
            <SubmitButton variant="danger" size="sm">ขอลบบัญชี</SubmitButton>
          </ActionForm>
        )}
      </Card>
    </div>
  );
}
