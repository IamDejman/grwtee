const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * The live site must check forms. Previews and local development work
 * without keys. Vercel sets VERCEL_ENV; elsewhere NODE_ENV decides.
 */
function turnstileRequired(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  return vercelEnv ? vercelEnv === "production" : process.env.NODE_ENV === "production";
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTurnstileEnabled()) {
    if (!turnstileRequired()) return { ok: true };
    // Fail closed: without the key, bots could use every public form freely.
    console.error("[Turnstile] TURNSTILE_SECRET_KEY is not set; refusing public form submissions");
    return { ok: false, message: "This form is unavailable right now. Email book@grwtee.com instead." };
  }

  if (!token) {
    return { ok: false, message: "CAPTCHA verification required" };
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY!,
    response: token
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000)
    });
    const json = (await res.json()) as { success?: boolean };
    if (!json.success) {
      return { ok: false, message: "CAPTCHA verification failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "CAPTCHA verification failed" };
  }
}
