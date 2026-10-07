"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/avatar";
import { setAvatar } from "./actions";

export function AvatarUploader({ userId, name, src }: { userId: string; name: string; src: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("ไฟล์ใหญ่เกิน 2MB");
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await createClient().storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const res = await setAvatar(path);
      if (!res.ok) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => input.current?.click()} className="relative" disabled={busy} aria-label="เปลี่ยนรูปโปรไฟล์">
        <Avatar name={name} src={src} size={64} />
        <span className="absolute -bottom-1 -right-1 rounded-full bg-accent p-1.5 text-[#04130d]"><Camera className="h-3.5 w-3.5" /></span>
      </button>
      <div className="text-sm">
        <p className="font-semibold">{name}</p>
        <p className="text-xs text-subtle">{busy ? "กำลังอัปโหลด…" : error ?? "แตะรูปเพื่อเปลี่ยน"}</p>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}
