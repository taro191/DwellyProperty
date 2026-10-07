"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mediaUrl } from "@/lib/format";
import { Photo } from "@/components/photo";
import { Alert, Badge, Button } from "@/components/ui";
import type { PropertyMedia } from "@/lib/types";
import { addMedia, makeCover, removeMedia } from "./actions";

const MAX_EDGE = 2000;

/** Downscale + re-encode to WebP in the browser to keep uploads small. */
async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("รองรับเฉพาะไฟล์รูปภาพ");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("แปลงรูปไม่สำเร็จ");
  return blob;
}

export function MediaManager({ propertyId, userId, media }: { propertyId: string; userId: string; media: PropertyMedia[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sorted = [...media].sort((a, b) => a.sort_order - b.sort_order);

  async function upload(files: FileList) {
    setError(null);
    const supabase = createClient();
    const list = Array.from(files).slice(0, 30 - media.length);
    for (const [i, file] of list.entries()) {
      setProgress(`กำลังอัปโหลด ${i + 1}/${list.length}…`);
      try {
        const blob = await compress(file);
        const path = `${userId}/${propertyId}/${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage.from("property-media").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
        if (upErr) throw new Error(upErr.message);
        const res = await addMedia(propertyId, path);
        if (!res.ok) {
          await supabase.storage.from("property-media").remove([path]);
          throw new Error(res.error);
        }
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ"}`);
      }
    }
    setProgress(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sorted.map((m, i) => (
          <div key={m.id} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
            <Photo src={mediaUrl(m)} alt="" fill sizes="25vw" />
            {i === 0 && <Badge tone="accent" className="absolute left-2 top-2 bg-black/70">รูปปก</Badge>}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/80 p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              {i !== 0 && (
                <button type="button" title="ตั้งเป็นรูปปก" disabled={pending}
                  onClick={() => startTransition(async () => { await makeCover(m.id); router.refresh(); })}
                  className="rounded-lg bg-white/15 p-1.5 hover:bg-white/30">
                  <Star className="h-4 w-4" />
                </button>
              )}
              <button type="button" title="ลบรูป" disabled={pending}
                onClick={() => startTransition(async () => { await removeMedia(m.id); router.refresh(); })}
                className="rounded-lg bg-white/15 p-1.5 hover:bg-red-500/60">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {media.length < 30 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={Boolean(progress)}
            className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-line text-sm text-subtle hover:border-accent hover:text-fg"
          >
            <span className="flex flex-col items-center gap-1">
              <ImagePlus className="h-6 w-6" />
              {progress ?? "เพิ่มรูป"}
            </span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        hidden
        onChange={(e) => e.target.files?.length && upload(e.target.files).finally(() => (e.target.value = ""))}
      />
      <p className="text-xs text-subtle">สูงสุด 30 รูป · ระบบย่อขนาดรูปให้อัตโนมัติ · รูปแรกจะเป็นรูปปก</p>
      {media.length === 0 && <Button type="button" variant="secondary" onClick={() => input.current?.click()}>เลือกรูปจากเครื่อง</Button>}
    </div>
  );
}
