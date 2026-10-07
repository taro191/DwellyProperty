import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, PageHeader, Select, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { INQUIRY_STATUS_LABEL, INTENT_LABEL } from "@/lib/constants";
import { formatTHB, timeAgo } from "@/lib/format";
import type { Inquiry, InquiryIntent, InquiryStatus } from "@/lib/types";
import { updateLead } from "../../deals-actions";

export const metadata: Metadata = { title: "ผู้สนใจ (Leads)" };

type Row = Inquiry & { properties: { title: string; code: string } | null; buyer: { display_name: string } | null };

export default async function LeadsPage({ searchParams }: PageProps<"/dashboard/leads">) {
  const viewer = await requireViewer("/dashboard/leads");
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in INQUIRY_STATUS_LABEL ? (sp.status as InquiryStatus) : undefined;
  const supabase = await createClient();
  let q = supabase
    .from("inquiries")
    .select("*, properties(title, code), buyer:profiles!inquiries_buyer_id_fkey(display_name)")
    .eq("seller_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  const leads = (data ?? []) as Row[];

  return (
    <div>
      <PageHeader title="ผู้สนใจ (Leads)" subtitle="ติดตามและอัปเดตสถานะผู้ที่ติดต่อเข้ามา" />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/dashboard/leads" className={!status ? "font-bold text-accent" : "text-subtle"}>ทั้งหมด</Link>
        {(Object.keys(INQUIRY_STATUS_LABEL) as InquiryStatus[]).map((s) => (
          <Link key={s} href={`/dashboard/leads?status=${s}`} className={status === s ? "font-bold text-accent" : "text-subtle"}>
            {INQUIRY_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>
      {leads.length === 0 ? (
        <EmptyState title="ยังไม่มีผู้สนใจ" />
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <Card key={l.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {l.buyer?.display_name} <Badge tone="accent">{INTENT_LABEL[l.intent as InquiryIntent]}</Badge>
                  </p>
                  <Link href={`/property/${l.properties?.code}`} className="text-xs text-subtle hover:text-fg">{l.properties?.title}</Link>
                </div>
                <span className="text-xs text-subtle">{timeAgo(l.created_at)}</span>
              </div>
              {l.message && <p className="mt-2 whitespace-pre-line text-sm text-muted">{l.message}</p>}
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {l.contact_phone && <a href={`tel:${l.contact_phone}`} className="text-accent">📞 {l.contact_phone}</a>}
                {l.budget && <span className="text-subtle">งบ {formatTHB(l.budget)}</span>}
              </div>
              <ActionForm action={updateLead} className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                <input type="hidden" name="id" value={l.id} />
                <Select name="status" defaultValue={l.status} aria-label="สถานะ">
                  {(Object.keys(INQUIRY_STATUS_LABEL) as InquiryStatus[]).map((s) => <option key={s} value={s}>{INQUIRY_STATUS_LABEL[s]}</option>)}
                </Select>
                <Textarea name="seller_notes" defaultValue={l.seller_notes ?? ""} placeholder="บันทึกส่วนตัว (ผู้ซื้อไม่เห็น)" className="min-h-11 py-2.5" />
                <SubmitButton size="md" variant="secondary">บันทึก</SubmitButton>
              </ActionForm>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
