/**
 * Central security headers — applied in middleware and mirrored in vercel.json.
 * Configure once here; infrastructure docs reference this module.
 */

/** The Content-Security-Policy; `extraConnectSrc` lets the page connect to more origins. */
function contentSecurityPolicy(extraConnectSrc: string[] = []): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com",
    // Cloudflare Turnstile renders its challenge in an iframe.
    "frame-src https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // Google Analytics hosts follow Google's CSP guide for GA4 without Ads; hits go to regional
    // hosts such as region1.google-analytics.com.
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://www.grwtee.com https://grwtee.com https://www.googletagmanager.com https://*.google-analytics.com",
    `connect-src ${["'self' https://res.cloudinary.com https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com", ...extraConnectSrc].join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ");
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": contentSecurityPolicy()
};

/**
 * This project's Supabase origins, for the browser client's REST calls and its Realtime WebSocket,
 * from NEXT_PUBLIC_SUPABASE_URL. Empty when that is unset or not an http(s) URL.
 */
export function supabaseOrigins(url: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string[] {
  if (!url) return [];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return [];
  }
  const socket = parsed.protocol === "https:" ? "wss:" : parsed.protocol === "http:" ? "ws:" : null;
  if (!socket) return [];
  return [`${parsed.protocol}//${parsed.host}`, `${socket}//${parsed.host}`];
}

/**
 * `supabase` also lets the page reach this project's Supabase. Only admin pages need it: the
 * stylist messages thread streams new messages over Supabase Realtime.
 */
export function applySecurityHeaders(response: Response, { supabase = false }: { supabase?: boolean } = {}): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (supabase) response.headers.set("Content-Security-Policy", contentSecurityPolicy(supabaseOrigins()));
  response.headers.delete("X-Powered-By");
  return response;
}
