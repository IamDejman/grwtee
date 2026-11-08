import { NextResponse } from "next/server";
import { createBooking, decemberEnabled, toErrorResponse } from "@/lib/december/booking";
import { guardPublicForm, turnstileTokenOf } from "@/lib/security/public-form";
import { clientIp, consumeRateLimit, isRateLimited } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

// Each unpaid booking holds a time for a day, so one connection can only make a few.
const HOLDS_PER_IP = 3;
const HOLD_WINDOW_MS = 24 * 60 * 60_000;

export async function POST(req: Request) {
  if (!decemberEnabled()) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const refused = await guardPublicForm(req, {
    form: "december-book",
    limit: 10,
    windowMs: 60 * 60_000,
    turnstileToken: turnstileTokenOf(json)
  });
  if (refused) return refused;

  const holdKey = `december-holds:${clientIp(req)}`;
  if (await isRateLimited(holdKey, HOLDS_PER_IP, HOLD_WINDOW_MS)) {
    return NextResponse.json(
      {
        success: false,
        error: "You've booked the most consultations we allow from one connection today. Message us on WhatsApp to book another."
      },
      { status: 429 }
    );
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const result = await createBooking(json, siteUrl);
    // A retried request that found its booking already made has no new link.
    if (result.manageUrl) {
      const counted = await consumeRateLimit(holdKey, HOLDS_PER_IP, HOLD_WINDOW_MS);
      if (!counted.ok) console.warn("[December] Hold limit passed during a burst for one IP");
    }
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
