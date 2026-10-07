import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { staffPods } from "@/server/services/trust";
import { Badge, Card, EmptyState, Input, PageHeader, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { formatDate } from "@/lib/format";
import { reviewPod } from "../actions";

export const metadata: Metadata = { title: "Agency Pods" };

export default async function AdminPodsPage() {
  const viewer = await requireStaff(["verifier"]);
  const pods = await staffPods(viewer);

  return (
    <div>
      <PageHeader title="Agency Pods" subtitle="ตรวจสอบทีมนายหน้า กำหนด Trust score และป้าย Verified Pod" />
      {pods.length === 0 ? <EmptyState title="ยังไม่มี Pod" /> : (
        <div className="space-y-3">
          {pods.map((p) => (
            <Card key={p.id} className="grid gap-4 p-4 md:grid-cols-[1fr_320px]">
              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{p.name}</p>
                  <Badge tone={p.status === "verified" ? "accent" : p.status === "pending" ? "warning" : "danger"}>{p.status}</Badge>
                  <span className="text-xs text-subtle">{p.code}</span>
                </div>
                <p className="text-subtle">
                  หัวหน้า {p.leader_name} · สมาชิก {p.members} คน
                  · โซน {p.zone_name ?? "-"} · สร้าง {formatDate(p.created_at)}
                </p>
                {p.description && <p className="text-muted">{p.description}</p>}
                <p className="text-xs">Trust score: <b>{p.trust_score}</b> · ★ {p.rating_avg} ({p.rating_count})</p>
              </div>
              <ActionForm action={reviewPod} className="space-y-2">
                <input type="hidden" name="id" value={p.id} />
                <Input name="trust_score" type="number" min={0} max={100} defaultValue={p.trust_score} aria-label="Trust score" />
                <Textarea name="note" placeholder="หมายเหตุถึงหัวหน้า Pod" className="min-h-14" />
                <div className="flex flex-wrap gap-2">
                  {p.status !== "verified" && <SubmitButton name="status" value="verified" size="sm">ยืนยัน Pod</SubmitButton>}
                  {p.status === "verified" && <SubmitButton name="status" value="verified" size="sm" variant="secondary">บันทึก Trust score</SubmitButton>}
                  {p.status !== "suspended" && <SubmitButton name="status" value="suspended" size="sm" variant="danger">ระงับ</SubmitButton>}
                </div>
              </ActionForm>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
