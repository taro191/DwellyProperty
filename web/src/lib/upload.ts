/** Browser helper: upload a file to /api/upload and get its stored path back. */
export async function uploadFile(bucket: string, scope: string, file: Blob, filename = "upload"): Promise<string> {
  const fd = new FormData();
  fd.append("bucket", bucket);
  fd.append("scope", scope);
  fd.append("file", file, filename);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
  if (!res.ok || !json.path) throw new Error(json.error ?? "อัปโหลดไม่สำเร็จ");
  return json.path;
}
