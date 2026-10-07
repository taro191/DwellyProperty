"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-bold">เกิดข้อผิดพลาด</h1>
      <p className="text-sm text-subtle">ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง{error.digest && ` (รหัส ${error.digest})`}</p>
      <Button onClick={reset}>ลองใหม่</Button>
    </main>
  );
}
