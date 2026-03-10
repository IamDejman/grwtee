import { sendGAEvent } from "@next/third-parties/google";

/**
 * Track a custom GA4 event. Use for conversions, CTA clicks, form submissions, etc.
 * Only sends when GA is loaded (e.g. NEXT_PUBLIC_GA_MEASUREMENT_ID is set).
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
  if (typeof window === "undefined") return;
  if (params) {
    sendGAEvent("event", name, params);
  } else {
    sendGAEvent("event", name);
  }
}
