import { prisma } from "@/lib/prisma";

/**
 * How long the website keeps what it collects (WEB-23). The privacy policy
 * (src/app/privacy/page.tsx) states the same periods: change both together.
 */
export const RETENTION_DAYS = {
  /** Sign-in sessions after they expired or were signed out. */
  adminSessions: 30,
  /** Reset codes after they expired. */
  resetCodes: 1,
  /** Security events (failed sign-ins, blocked requests). */
  securityEvents: 365,
  /** The admin audit log. */
  auditLog: 730,
  /** Rate-limit counters. */
  rateLimits: 2,
  /** Booking-form enquiries, after they were last updated. */
  bookingRequests: 730,
  /** December consultations, after the call. */
  decemberBookings: 730,
  /** December holds that lapsed or were cancelled, after the call's time. */
  decemberCancelled: 90,
  /** December forms people started and didn't finish. */
  decemberDrafts: 90,
  /** Newsletter sign-ups never confirmed, and addresses after unsubscribing. */
  newsletterInactive: 30,
  /** Who each newsletter went to, after it finished sending. */
  broadcastRecipients: 90
} as const;

const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * 86_400_000);

/** Deletes what's past its time. Returns how many rows of each went. */
export async function deleteExpiredData(now = new Date()): Promise<Record<string, number>> {
  const d = RETENTION_DAYS;
  const results = await prisma.$transaction([
    prisma.adminSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: daysAgo(now, d.adminSessions) } },
          { revokedAt: { lt: daysAgo(now, d.adminSessions) } }
        ]
      }
    }),
    prisma.passwordResetOtp.deleteMany({ where: { expiresAt: { lt: daysAgo(now, d.resetCodes) } } }),
    prisma.securityEvent.deleteMany({ where: { createdAt: { lt: daysAgo(now, d.securityEvents) } } }),
    prisma.adminAuditLog.deleteMany({ where: { createdAt: { lt: daysAgo(now, d.auditLog) } } }),
    prisma.rateLimitBucket.deleteMany({ where: { windowStart: { lt: daysAgo(now, d.rateLimits) } } }),
    prisma.bookingRequest.deleteMany({ where: { updatedAt: { lt: daysAgo(now, d.bookingRequests) } } }),
    prisma.decemberBooking.deleteMany({
      where: {
        OR: [
          { slotEnd: { lt: daysAgo(now, d.decemberBookings) } },
          { status: { in: ["cancelled", "expired"] }, slotEnd: { lt: daysAgo(now, d.decemberCancelled) } }
        ]
      }
    }),
    prisma.decemberDraft.deleteMany({
      where: {
        OR: [
          { bookedAt: null, updatedAt: { lt: daysAgo(now, d.decemberDrafts) } },
          // A finished form's details are on the booking itself.
          { bookedAt: { lt: daysAgo(now, d.decemberDrafts) } }
        ]
      }
    }),
    prisma.subscriber.deleteMany({
      where: {
        OR: [
          { status: "pending", createdAt: { lt: daysAgo(now, d.newsletterInactive) } },
          { status: "unsubscribed", unsubscribedAt: { lt: daysAgo(now, d.newsletterInactive) } }
        ]
      }
    }),
    prisma.broadcastRecipient.deleteMany({
      where: { broadcast: { status: "sent", updatedAt: { lt: daysAgo(now, d.broadcastRecipients) } } }
    })
  ]);

  const names = [
    "adminSessions",
    "resetCodes",
    "securityEvents",
    "auditLog",
    "rateLimits",
    "bookingRequests",
    "decemberBookings",
    "decemberDrafts",
    "subscribers",
    "broadcastRecipients"
  ];
  return Object.fromEntries(names.map((name, i) => [name, results[i].count]));
}
