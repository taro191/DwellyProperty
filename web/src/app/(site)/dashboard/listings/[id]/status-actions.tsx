"use client";

import { ActionForm, SubmitButton } from "@/components/ui/form";
import type { PropertyStatus } from "@/lib/types";
import { changeListingStatus, deleteListing } from "../actions";

type Move = { to: PropertyStatus; label: string; variant?: "primary" | "secondary" | "danger" };

const MOVES: Partial<Record<PropertyStatus, Move[]>> = {
  draft: [{ to: "pending_review", label: "ส่งให้ทีมงานตรวจสอบ", variant: "primary" }],
  rejected: [{ to: "pending_review", label: "แก้ไขแล้ว ส่งตรวจอีกครั้ง", variant: "primary" }],
  pending_review: [{ to: "draft", label: "ถอนกลับเป็นแบบร่าง", variant: "secondary" }],
  active: [
    { to: "reserved", label: "ติดจองแล้ว", variant: "secondary" },
    { to: "sold", label: "ขายแล้ว", variant: "secondary" },
    { to: "rented", label: "ให้เช่าแล้ว", variant: "secondary" },
  ],
  reserved: [
    { to: "active", label: "กลับมาเปิดขาย", variant: "primary" },
    { to: "sold", label: "ขายแล้ว", variant: "secondary" },
    { to: "rented", label: "ให้เช่าแล้ว", variant: "secondary" },
  ],
  expired: [{ to: "pending_review", label: "ต่ออายุประกาศ (ส่งตรวจใหม่)", variant: "primary" }],
  sold: [{ to: "pending_review", label: "ลงประกาศใหม่อีกครั้ง", variant: "secondary" }],
  rented: [{ to: "pending_review", label: "ลงประกาศใหม่อีกครั้ง", variant: "secondary" }],
  archived: [{ to: "pending_review", label: "เปิดประกาศอีกครั้ง", variant: "secondary" }],
};

export function StatusActions({ id, status, isOwner }: { id: string; status: PropertyStatus; isOwner: boolean }) {
  const moves = [...(MOVES[status] ?? [])];
  if (status !== "archived" && status !== "draft" && status !== "rejected") moves.push({ to: "archived", label: "ปิดประกาศ", variant: "danger" });

  return (
    <div className="space-y-2">
      <ActionForm action={changeListingStatus} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={id} />
        {moves.map((m) => (
          <SubmitButton key={m.to} name="status" value={m.to} variant={m.variant} size="sm" pendingText="กำลังอัปเดต…">
            {m.label}
          </SubmitButton>
        ))}
      </ActionForm>
      {isOwner && (status === "draft" || status === "rejected") && (
        <ActionForm action={deleteListing}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton variant="ghost" size="sm" className="text-red-300" pendingText="กำลังลบ…">ลบแบบร่างนี้</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
