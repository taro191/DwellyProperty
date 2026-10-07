import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl font-black text-accent">404</p>
      <h1 className="text-xl font-bold">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="text-sm text-subtle">ประกาศนี้อาจถูกปิดหรือย้ายไปแล้ว</p>
      <div className="flex gap-2">
        <Link href="/" className={buttonClass("secondary")}>หน้าแรก</Link>
        <Link href="/search" className={buttonClass("primary")}>ค้นหาทรัพย์</Link>
      </div>
    </main>
  );
}
