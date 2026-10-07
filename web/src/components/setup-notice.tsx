export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-extrabold">Dwelly — ยังไม่ได้เชื่อมต่อ Supabase</h1>
      <p className="text-muted">
        คัดลอก <code className="rounded bg-surface-2 px-1.5 py-0.5">web/.env.example</code> เป็น{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5">web/.env.local</code> แล้วใส่ค่า{" "}
        <code>NEXT_PUBLIC_SUPABASE_URL</code> และ <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> จากนั้นรีสตาร์ท dev server
      </p>
      <p className="text-sm text-subtle">ดูขั้นตอนทั้งหมดใน README.md ที่ root ของโปรเจกต์</p>
    </main>
  );
}
