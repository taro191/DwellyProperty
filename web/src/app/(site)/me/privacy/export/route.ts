import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { exportMyData } from "@/server/services/account";

/** PDPA right of access: download everything we hold about the signed-in user. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await exportMyData(viewer);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dwelly-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
