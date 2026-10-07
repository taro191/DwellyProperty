import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, PageHeader, cn } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { VERIFICATION_KIND_LABEL, VERIFICATION_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { VerificationRequest, VerificationStatus } from "@/lib/types";
import { reviewVerification } from "../actions";
import { ReasonPicker } from "../reason-picker";

export const metadata: Metadata = { title: "ตรวจเอกสาร" };

const STATUSES: VerificationStatus[] = ["pending", "needs_info", "approved", "rejected"];
const NOTES = [
  "รูปเอกสารไม่ชัด กรุณาถ่ายใหม่ให้เห็นข้อมูลครบ",
  "ชื่อในเอกสารไม่ตรงกับชื่อบัญชี",
  "เอกสารหมดอายุ",
  "กรุณาแนบหน้าสารบัญจดทะเบียนของโฉนดเพิ่มเติม",
];

type Row = VerificationRequest & {
  applicant: { display_name: string; is_kyc_verified: boolean } | null;
  properties: { title: string; code: string } | null;
  verification_documents: { id: string; doc_type: string; storage_path: string }[];
};

export default async function AdminVerificationsPage({ searchParams }: PageProps<"/admin/verifications">) {
  await requireStaff(["verifier"]);
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status) ?? "pending";
  const supabase = await createClient();
  const { data } = await supabase
    .from("verification_requests")
    .select("*, applicant:profiles!verification_requests_user_id_fkey(display_name, is_kyc_verified), properties(title, code), verification_documents(id, doc_type, storage_path)")
    .eq("status", status)
    .order("submitted_at", { ascending: status === "pending" })
    .limit(50);
  const rows = (data ?? []) as Row[];

  // Short-lived links to private documents (verifier storage policy allows read).
  const paths = rows.flatMap((r) => r.verification_documents.map((d) => d.storage_path));
  const { data: signed } = paths.length
    ? await supabase.storage.from("verification-docs").createSignedUrls(paths, 60 * 30)
    : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div>
      <PageHeader title="ตรวจเอกสารยืนยัน" subtitle="KYC · ใบอนุญาตนายหน้า · กรรมสิทธิ์ทรัพย์ — ลิงก์เอกสารมีอายุ 30 นาที" />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/verifications?status=${s}`}
            className={cn("rounded-full border px-3 py-1 text-sm", status === s ? "border-accent bg-accent/10 text-accent-strong" : "border-line text-subtle")}>
            {VERIFICATION_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState title="ไม่มีคำขอในสถานะนี้" /> : (
        <div className="space-y-4">
          {rows.map((r) => (
            <Card key={r.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{VERIFICATION_KIND_LABEL[r.kind]}</Badge>
                  <span className="text-xs text-subtle">ส่งเมื่อ {formatDateTime(r.submitted_at)} ({timeAgo(r.submitted_at)})</span>
                </div>
                <p>
                  ผู้ยื่น: <Link href={`/admin/users/${r.user_id}`} className="font-semibold text-accent">{r.applicant?.display_name}</Link>
                  {r.applicant?.is_kyc_verified && <Badge tone="accent" className="ml-2">KYC ✓</Badge>}
                </p>
                {r.properties && <p>ประกาศ: <Link href={`/admin/listings/${r.property_id}`} className="text-accent">{r.properties.code} {r.properties.title}</Link></p>}
                <dl className="grid gap-1 rounded-2xl bg-surface-2 p-3">
                  {Object.entries(r.submitted_data ?? {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3"><dt className="text-subtle">{k}</dt><dd>{String(v)}</dd></div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2">
                  {r.verification_documents.length === 0 && <Badge tone="danger">ไม่มีไฟล์แนบ</Badge>}
                  {r.verification_documents.map((d) => (
                    <a key={d.id} href={urlFor.get(d.storage_path) ?? "#"} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs hover:border-accent">
                      <FileText className="h-3.5 w-3.5" /> {d.doc_type}
                    </a>
                  ))}
                </div>
                {r.reviewer_note && <p className="text-xs text-subtle">หมายเหตุผู้ตรวจ: {r.reviewer_note}</p>}
              </div>
              {(r.status === "pending" || r.status === "needs_info") && (
                <ActionForm action={reviewVerification} className="space-y-2">
                  <input type="hidden" name="id" value={r.id} />
                  <SubmitButton name="decision" value="approved" className="w-full">✓ อนุมัติ</SubmitButton>
                  <ReasonPicker templates={NOTES} name="note" placeholder="เหตุผล / สิ่งที่ต้องการเพิ่ม" />
                  <div className="grid grid-cols-2 gap-2">
                    <SubmitButton name="decision" value="needs_info" variant="secondary" size="sm">ขอข้อมูลเพิ่ม</SubmitButton>
                    <SubmitButton name="decision" value="rejected" variant="danger" size="sm">ไม่อนุมัติ</SubmitButton>
                  </div>
                </ActionForm>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
