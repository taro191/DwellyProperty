import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runMaintenance } from "@/server/services/admin";

/**
 * Hourly maintenance for hosts with HTTP cron (e.g. Plesk Scheduled Tasks → "Fetch a URL").
 * Auth: `Authorization: Bearer $CRON_SECRET` or `?token=$CRON_SECRET`.
 */
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") || req.nextUrl.searchParams.get("token") || "";
  return Boolean(secret) && given.length === secret!.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret!));
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runMaintenance());
}

export const GET = handle;
export const POST = handle;
