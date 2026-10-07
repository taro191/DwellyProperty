"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui";
import { toggleActivityRegistration } from "./actions";

export function ActivityRegisterButton({ activityId, registered, signedIn }: { activityId: string; registered: boolean; signedIn: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!signedIn) return <Link href="/login?next=/hubs" className={buttonClass("secondary", "sm")}>เข้าสู่ระบบเพื่อลงทะเบียน</Link>;
  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant={registered ? "secondary" : "primary"}
        disabled={pending}
        onClick={() => startTransition(async () => {
          const r = await toggleActivityRegistration(activityId, !registered);
          setError(r.ok ? null : r.error);
        })}
      >
        {pending ? "…" : registered ? "ยกเลิกการลงทะเบียน" : "ลงทะเบียนฟรี"}
      </Button>
      {registered && <span className="text-xs text-accent">ลงทะเบียนแล้ว ✓</span>}
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
