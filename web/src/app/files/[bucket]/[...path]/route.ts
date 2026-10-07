import { NextResponse, type NextRequest } from "next/server";
import { BUCKETS, isBucket, readStoredFile } from "@/server/storage";
import { getViewer } from "@/lib/auth";
import { canReadVerificationFile } from "@/server/services/trust";
import { isMember } from "@/server/services/chat";
import { isStaff } from "@/server/services/core";

/** Serves uploaded files. Public buckets are cached; private buckets check permission per request. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/files/[bucket]/[...path]">) {
  const { bucket, path } = await ctx.params;
  if (!isBucket(bucket)) return new NextResponse("Not found", { status: 404 });
  const rel = path.map(decodeURIComponent).join("/");

  if (!BUCKETS[bucket].public) {
    const viewer = await getViewer();
    if (!viewer) return new NextResponse("Unauthorized", { status: 401 });
    const allowed =
      bucket === "verification-docs"
        ? await canReadVerificationFile(viewer, rel)
        : rel.startsWith(`${viewer.id}/`) || isStaff(viewer, ["support"]) || (await isMember(path[1] ?? "", viewer.id));
    if (!allowed) return new NextResponse("Forbidden", { status: 403 });
  }

  const file = await readStoredFile(bucket, rel);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": BUCKETS[bucket].public ? "public, max-age=31536000, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(file.type === "application/pdf" ? { "Content-Disposition": "inline" } : {}),
    },
  });
}
