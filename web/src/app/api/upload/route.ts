import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { isBucket, saveFile } from "@/server/storage";

/**
 * Upload a file for the signed-in user. Returns the bucket-relative path
 * ({userId}/{scope}/{uuid}.ext); a server action then attaches it to a record
 * after checking ownership of `scope` (listing id, verification request id, …).
 */
export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (viewer.status !== "active") return NextResponse.json({ error: "บัญชีถูกระงับ" }, { status: 403 });

  const form = await req.formData();
  const bucket = String(form.get("bucket") ?? "");
  const scope = String(form.get("scope") ?? "");
  const file = form.get("file");
  if (!isBucket(bucket) || !(file instanceof File)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (bucket !== "avatars" && !z.uuid().safeParse(scope).success) return NextResponse.json({ error: "invalid scope" }, { status: 400 });

  try {
    const path = await saveFile(bucket, viewer.id, bucket === "avatars" ? "avatar" : scope, file);
    return NextResponse.json({ path });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ" }, { status: 400 });
  }
}
