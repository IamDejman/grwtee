type Gtag = (...args: unknown[]) => void;

/** True once the GA snippet has run; false while it waits to load or when blocked (e.g. by a content blocker). */
export function isGALoaded(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as { gtag?: unknown }).gtag === "function";
}

/** Calls GA's gtag() when it has loaded; does nothing otherwise. */
export function gtag(...args: unknown[]): void {
  if (isGALoaded()) (window as unknown as { gtag: Gtag }).gtag(...args);
}

/**
 * Track a custom GA4 event. Use for conversions, CTA clicks, form submissions, etc.
 * Only sends when GA is loaded and not blocked (e.g. NEXT_PUBLIC_GA_MEASUREMENT_ID set and script loaded).
 *
 * @example
 * trackEvent('book_consultation_click');
 * trackEvent('contact_submit', { form_name: 'footer' });
 * trackEvent('generate_certificate', { service_id: 'xyz' });
 */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!isGALoaded()) return;
  if (params) {
    gtag("event", name, params);
  } else {
    gtag("event", name);
  }
}
