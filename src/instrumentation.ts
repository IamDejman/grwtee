import * as Sentry from "@sentry/nextjs";
import { DATA_COLLECTION, scrubBreadcrumb, scrubEvent } from "@/lib/sentry-scrub";

/**
 * Server error reports (OPS-07). Off until SENTRY_DSN is set; requests,
 * cookies and query strings are removed first (src/lib/sentry-scrub.ts).
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || "development",
    dataCollection: DATA_COLLECTION,
    beforeSend: scrubEvent,
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb)
  });
}

// Errors a route or page didn't catch.
export const onRequestError = Sentry.captureRequestError;
