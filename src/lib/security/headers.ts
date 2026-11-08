/**
 * The site's security headers, defined only here (WEB-16): next.config.ts
 * sends them with every response, static files included, and the
 * middleware adds them to the responses it makes itself. Admin pages get
 * adminContentSecurityPolicy() instead of the public policy.
 *
 * Scripts still need 'unsafe-inline': Next.js writes inline scripts into
 * every page, and replacing that with a per-request nonce would make every
 * page render on demand. That's the next step if the policy is tightened.
 */

/**
 * The Content-Security-Policy; `extraConnectSrc` lets the page connect to more origins, and
 * `extraImgSrc` lets it show images from more origins.
 */
function contentSecurityPolicy(extraConnectSrc: string[] = [], extraImgSrc: string[] = []): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' is only for the development server's hot reload.
    `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com`,
    // Cloudflare Turnstile renders its challenge in an iframe.
    "frame-src https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // Google Analytics hosts follow Google's CSP guide for GA4 without Ads; hits go to regional
    // hosts such as region1.google-analytics.com.
    `img-src ${["'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://www.grwtee.com https://grwtee.com https://www.googletagmanager.com https://*.google-analytics.com", ...extraImgSrc].join(" ")}`,
    // Gallery uploads go straight from the browser to Cloudinary, not through the site (WEB-21).
    `connect-src ${["'self' https://res.cloudinary.com https://api.cloudinary.com https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com", ...extraConnectSrc].join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ");
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  // The old XSS filter is gone from current browsers and could be abused in
  // older ones; 0 turns it off.
  "X-XSS-Protection": "0",
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
 * The policy for admin pages, which also reach this project's Supabase: the stylist pages show
 * photos from the app's storage (wardrobes, avatars, lookbook covers, message photos), upload
 * look and lookbook photos straight to it (WEB-21), and the messages thread streams new messages
 * over Supabase Realtime.
 */
export function adminContentSecurityPolicy(): string {
  const origins = supabaseOrigins();
  return contentSecurityPolicy(origins, origins.filter((o) => o.startsWith("http")));
}

/** `supabase` gives the page adminContentSecurityPolicy() instead of the public policy. */
export function applySecurityHeaders(response: Response, { supabase = false }: { supabase?: boolean } = {}): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (supabase) response.headers.set("Content-Security-Policy", adminContentSecurityPolicy());
  response.headers.delete("X-Powered-By");
  return response;
}
