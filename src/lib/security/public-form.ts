import { NextResponse } from "next/server";
import { clientIp, consumeRateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

/**
 * The checks every public form runs before it saves anything or sends email:
 * a per-IP limit kept in the database (so it holds across server instances),
 * then Turnstile. Returns the response to send back when the request is
 * refused, or null to carry on.
 */
export async function guardPublicForm(
  req: Request,
  options: { form: string; limit: number; windowMs: number; turnstileToken: unknown }
): Promise<NextResponse | null> {
  const ip = clientIp(req);
  const { ok, retryAfterSeconds } = await consumeRateLimit(`form:${options.form}:${ip}`, options.limit, options.windowMs);
  if (!ok) return tooManyRequests(retryAfterSeconds);

  const token = typeof options.turnstileToken === "string" ? options.turnstileToken : undefined;
  const captcha = await verifyTurnstileToken(token, ip === "unknown" ? null : ip);
  if (!captcha.ok) {
    return NextResponse.json({ success: false, error: captcha.message, code: "captcha" }, { status: 400 });
  }
  return null;
}

export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { success: false, error: "Too many requests. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

/** The token a form sent with its fields, if any. */
export function turnstileTokenOf(body: unknown): unknown {
  return body && typeof body === "object" ? (body as { turnstileToken?: unknown }).turnstileToken : undefined;
}
