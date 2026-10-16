/**
 * Central security headers — applied in middleware and mirrored in vercel.json.
 * Configure once here; infrastructure docs reference this module.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com",
    // Cloudflare Turnstile renders its challenge in an iframe.
    "frame-src https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // Google Analytics hosts follow Google's CSP guide for GA4 without Ads; hits go to regional
    // hosts such as region1.google-analytics.com.
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://www.grwtee.com https://grwtee.com https://www.googletagmanager.com https://*.google-analytics.com",
    "connect-src 'self' https://res.cloudinary.com https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com",
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
