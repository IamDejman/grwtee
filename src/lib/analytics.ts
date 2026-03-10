import { sendGAEvent } from "@next/third-parties/google";

/** True when the GA script has loaded; false when blocked (e.g. by content blocker). */
export function isGALoaded(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as { gtag?: unknown }).gtag === "function";
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
    sendGAEvent("event", name, params);
  } else {
    sendGAEvent("event", name);
  }
}
