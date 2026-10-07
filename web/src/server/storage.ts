import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * File storage on the host's disk (STORAGE_DIR, default ./storage — keep it outside `public/`
 * and include it in backups). Layout: {bucket}/{userId}/{scope}/{uuid}.{ext}
 */
export const BUCKETS = {
  "avatars": { public: true, maxBytes: 2 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  "property-media": { public: true, maxBytes: 10 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  "verification-docs": { public: false, maxBytes: 10 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
  "chat-attachments": { public: false, maxBytes: 10 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
} as const;
export type Bucket = keyof typeof BUCKETS;

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
export const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

const ROOT = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.STORAGE_DIR ?? "storage");
const SAFE_SEGMENT = /^[A-Za-z0-9._-]{1,100}$/;

export function isBucket(b: string): b is Bucket {
  return Object.hasOwn(BUCKETS, b);
}

/** Resolve a bucket-relative path safely (no traversal). */
function resolvePath(bucket: Bucket, rel: string) {
  const parts = rel.split("/");
  if (parts.length < 2 || !parts.every((p) => SAFE_SEGMENT.test(p) && p !== "." && p !== "..")) throw new Error("invalid path");
  const full = path.join(ROOT, bucket, ...parts);
  if (!full.startsWith(path.join(ROOT, bucket) + path.sep)) throw new Error("invalid path");
  return full;
}

export async function saveFile(bucket: Bucket, userId: string, scope: string, file: File): Promise<string> {
  const rule = BUCKETS[bucket];
  if (!(rule.types as readonly string[]).includes(file.type)) throw new Error("ไม่รองรับไฟล์ประเภทนี้");
  if (file.size > rule.maxBytes) throw new Error(`ไฟล์ใหญ่เกิน ${Math.round(rule.maxBytes / 1024 / 1024)}MB`);
  if (!SAFE_SEGMENT.test(scope)) throw new Error("invalid scope");
  const rel = `${userId}/${scope}/${randomUUID()}.${EXT[file.type]}`;
  const full = resolvePath(bucket, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  return rel;
}

export async function readStoredFile(bucket: Bucket, rel: string): Promise<{ data: Buffer; type: string } | null> {
  try {
    const full = resolvePath(bucket, rel);
    await stat(full);
    return { data: await readFile(full), type: MIME[path.extname(full).slice(1)] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function removeFiles(bucket: Bucket, rels: string[]) {
  for (const rel of rels) {
    try {
      await rm(resolvePath(bucket, rel), { force: true });
    } catch {
      /* ignore invalid / missing */
    }
  }
}

/** Remove everything a user uploaded to a bucket (PDPA deletion). */
export async function removeUserFolder(bucket: Bucket, userId: string) {
  if (!SAFE_SEGMENT.test(userId)) return;
  const dir = path.join(ROOT, bucket, userId);
  try {
    await readdir(dir);
    await rm(dir, { recursive: true, force: true });
  } catch {
    /* nothing stored */
  }
}

/** Public URL for files in public buckets (served by app/files/[bucket]/[...path]). */
export function publicFileUrl(bucket: Bucket, rel: string) {
  return `/files/${bucket}/${rel}`;
}
