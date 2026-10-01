import { NextResponse } from "next/server";
import { pruneDrafts } from "@/lib/december/drafts";
import { expireHolds } from "@/lib/december/booking";
import { sendDueReminders } from "@/lib/december/reminders";
import { cronAuthorised } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Daily December job (Vercel Cron): lapsed holds, reminders, then old drafts. Holds are also
 * released hourly by /api/cron/december-holds; sweeping here too covers that job being down.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const expiredHolds = await expireHolds();
    const result = await sendDueReminders();
    if (result.failed) console.error("[December] %d reminder emails failed", result.failed);
    const prunedDrafts = await pruneDrafts();
    return NextResponse.json({ success: true, ...result, expiredHolds, prunedDrafts });
  } catch (err) {
    console.error("[December] Reminder job failed", err);
    return NextResponse.json({ success: false, error: "Reminder job failed" }, { status: 500 });
  }
}
