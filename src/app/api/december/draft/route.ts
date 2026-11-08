import { NextResponse } from "next/server";
import { decemberEnabled } from "@/lib/december/booking";
import { saveDraft } from "@/lib/december/drafts";
import { tooManyRequests } from "@/lib/security/public-form";
import { clientIp, consumeRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

// The flow saves on every step, so allow plenty of saves but only a few new
// drafts: each one stores someone's contact details.
const MAX_SAVES = 40;
const SAVE_WINDOW_MS = 10 * 60_000;
const MAX_NEW_DRAFTS = 5;
const NEW_DRAFT_WINDOW_MS = 24 * 60 * 60_000;

export async function POST(req: Request) {
  if (!decemberEnabled()) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  const ip = clientIp(req);
  const saves = await consumeRateLimit(`december-draft:${ip}`, MAX_SAVES, SAVE_WINDOW_MS);
  if (!saves.ok) return tooManyRequests(saves.retryAfterSeconds);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const outcome = await saveDraft(json, async () =>
      (await consumeRateLimit(`december-draft-new:${ip}`, MAX_NEW_DRAFTS, NEW_DRAFT_WINDOW_MS)).ok
    );
    if (outcome === "limited") return tooManyRequests(60);
    return NextResponse.json({ success: outcome === "saved" }, { status: outcome === "saved" ? 200 : 400 });
  } catch (err) {
    console.error("[December] Draft save failed", err);
    return NextResponse.json({ success: false, error: "Could not save" }, { status: 500 });
  }
}
