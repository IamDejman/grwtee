/**
 * The site's security headers, defined only here (WEB-16): next.config.ts
 * sends them with every response, static files included, and the
 * middleware adds them to the responses it makes itself.
 *
 * Scripts still need 'unsafe-inline': Next.js writes inline scripts into
 * every page, and replacing that with a per-request nonce would make every
 * page render on demand. That's the next step if the policy is tightened.
 */

// The app's Supabase storage, which the stylist pages show photos from
// (wardrobes, avatars, lookbook covers, message photos).
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  // The old XSS filter is gone from current browsers and could be abused in
  // older ones; 0 turns it off.
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    // 'unsafe-eval' is only for the development server's hot reload.
    `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com`,
    // Cloudflare Turnstile renders its challenge in an iframe.
    "frame-src https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // Google Analytics hosts follow Google's CSP guide for GA4 without Ads; hits go to regional
    // hosts such as region1.google-analytics.com.
    `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://www.grwtee.com https://grwtee.com https://www.googletagmanager.com https://*.google-analytics.com ${SUPABASE_ORIGIN}`.trim(),
    // Uploads go straight from the browser to Cloudinary (gallery) and to
    // Supabase storage (looks and lookbooks), not through the site (WEB-21).
    `connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com ${SUPABASE_ORIGIN}`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ")
};

export function applySecurityHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.delete("X-Powered-By");
  return response;
}
