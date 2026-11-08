import { NextResponse } from "next/server";
import { resumeBroadcasts } from "@/lib/broadcasts";
import { cronAuthorised } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Finishes any newsletter broadcast still going out, for when nobody kept the
 * mailing list page open. Schedule it like december-holds: in Supabase
 * (pg_cron + pg_net, every 15 minutes or hourly), sending
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const broadcasts = await resumeBroadcasts(45_000);
  return NextResponse.json({
    success: true,
    broadcasts: broadcasts.map((b) => ({ id: b.id, status: b.status, remaining: b.remaining, lastError: b.lastError }))
  });
}
