import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { pruneDrafts } from "@/lib/december/drafts";
import { expireHolds } from "@/lib/december/booking";
import { sendDueReminders } from "@/lib/december/reminders";

export const dynamic = "force-dynamic";

/** Daily December job: lapsed holds, reminders, then old drafts. Called by Vercel Cron, which sends `Authorization: Bearer $CRON_SECRET`. */
function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
