import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { myVerificationRequests } from "@/server/services/trust";
import { listManagedListings } from "@/server/services/listings";
import { Alert, Badge, Card, PageHeader, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { VERIFICATION_KIND_LABEL, VERIFICATION_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { VerificationKind } from "@/lib/types";
import { VerificationForm } from "./verification-form";
import { resubmitVerification } from "../actions";

export const metadata: Metadata = { title: "ยืนยันตัวตนและเอกสาร" };

const tone = { pending: "warning", needs_info: "info", approved: "accent", rejected: "danger" } as const;

export default async function VerificationPage({ searchParams }: PageProps<"/me/verification">) {
  const viewer = await requireViewer("/me/verification");
  const sp = await searchParams;
  const [rows, managed] = await Promise.all([myVerificationRequests(viewer), listManagedListings(viewer)]);
  const listings = managed.filter((l) => l.owner_id === viewer.id && !l.is_verified && l.status !== "archived");
  const defaultKind = (typeof sp.kind === "string" && sp.kind in VERIFICATION_KIND_LABEL ? sp.kind : "identity") as VerificationKind;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="ยืนยันตัวตนและเอกสาร" subtitle="เพิ่มความน่าเชื่อถือด้วยป้าย Verified — เอกสารเห็นเฉพาะทีมตรวจสอบของ Dwelly" />
      {viewer.profile.is_kyc_verified && <Alert tone="accent">บัญชีของคุณยืนยันตัวตนแล้ว ✓</Alert>}

      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{VERIFICATION_KIND_LABEL[r.kind]}{r.property_title && ` · ${r.property_title}`}</p>
                <Badge tone={tone[r.status]}>{VERIFICATION_STATUS_LABEL[r.status]}</Badge>
              </div>
              <p className="text-xs text-subtle">ส่งเมื่อ {formatDateTime(r.submitted_at)} · เอกสาร {r.doc_count} ไฟล์</p>
              {r.reviewer_note && <p className="mt-2 text-sm text-muted">ความเห็นทีมงาน: {r.reviewer_note}</p>}
              {r.status === "needs_info" && (
                <ActionForm action={resubmitVerification} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={r.id} />
                  <Textarea name="note" placeholder="ชี้แจงหรือระบุข้อมูลเพิ่มเติม" className="min-h-20" />
                  <SubmitButton size="sm">ส่งข้อมูลเพิ่มเติม</SubmitButton>
                </ActionForm>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="p-5">
        <h2 className="mb-4 font-bold">ยื่นคำขอใหม่</h2>
        <VerificationForm
          defaultKind={defaultKind}
          defaultProperty={typeof sp.property === "string" ? sp.property : undefined}
          listings={listings.map((l) => ({ id: l.id, label: `${l.code} · ${l.title}` }))}
          kycDone={viewer.profile.is_kyc_verified}
        />
      </Card>
    </div>
  );
}
