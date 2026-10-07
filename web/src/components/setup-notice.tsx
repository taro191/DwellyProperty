export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-extrabold">Dwelly — ยังไม่ได้ตั้งค่าฐานข้อมูล</h1>
      <p className="text-muted">
        คัดลอก <code className="rounded bg-surface-2 px-1.5 py-0.5">web/.env.example</code> เป็น{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5">web/.env.local</code> แล้วใส่{" "}
        <code>DATABASE_URL</code> (MySQL) และ <code>BETTER_AUTH_SECRET</code> จากนั้นรัน{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5">npm run db:migrate</code> และรีสตาร์ท server
      </p>
      <p className="text-sm text-subtle">ดูขั้นตอนทั้งหมดใน README.md ที่ root ของโปรเจกต์</p>
    </main>
  );
}
