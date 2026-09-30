import { NextResponse } from "next/server";
import { createBooking, decemberEnabled, toErrorResponse } from "@/lib/december/booking";
import { requestMeta } from "@/lib/security/audit-log";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!decemberEnabled()) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const captcha = await verifyTurnstileToken(
    (json as { turnstileToken?: string })?.turnstileToken,
    requestMeta(req).ip
  );
  if (!captcha.ok) {
    return NextResponse.json({ success: false, error: captcha.message, code: "captcha" }, { status: 400 });
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const result = await createBooking(json, siteUrl);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
