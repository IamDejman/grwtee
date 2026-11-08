import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/security/cron-auth";
import { deleteExpiredData } from "@/lib/retention";

export const dynamic = "force-dynamic";

/**
 * Daily: deletes personal data past the periods in src/lib/retention.ts
 * (WEB-23). Scheduled in Supabase (pg_cron + pg_net, job "website-cleanup"
 * in the app repo's 28-scheduled-jobs.sql), which sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const deleted = await deleteExpiredData();
    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error("[Cleanup] failed", { code: (err as { code?: string }).code });
    return NextResponse.json({ success: false, error: "Cleanup failed" }, { status: 500 });
  }
}
