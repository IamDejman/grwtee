const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTurnstileEnabled()) {
    return { ok: true };
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
      body
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
