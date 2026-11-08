import * as Sentry from "@sentry/nextjs";
import { DATA_COLLECTION, scrubBreadcrumb, scrubEvent } from "@/lib/sentry-scrub";

// Browser error reports (OPS-07): off until NEXT_PUBLIC_SENTRY_DSN is set.
// No session replay. Reports go through /monitoring on this site, so the
// security policy needs no new address.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "production",
    dataCollection: DATA_COLLECTION,
    beforeSend: scrubEvent,
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb)
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
