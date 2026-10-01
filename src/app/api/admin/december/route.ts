import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeBookingCount, bookingMode, expireHolds } from "@/lib/december/booking";
import { getSettings } from "@/lib/december/settings";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { requireAdminSession } from "@/lib/security/session-auth";

export const dynamic = "force-dynamic";

const BOOKING_FIELDS = {
  id: true,
  status: true,
  name: true,
  email: true,
  whatsapp: true,
  country: true,
  occasions: true,
  otherOccasion: true,
  looks: true,
  events: true,
  plans: true,
  styleWords: true,
  styleNotes: true,
  styleLinks: true,
  comments: true,
  timezone: true,
  slotStart: true,
  meetUrl: true,
  holdExpiresAt: true,
  paidAt: true,
  cancelledAt: true,
  createdAt: true
} as const;

/** Everything the December admin page needs in one call. */
export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();
  try {
    // Release lapsed holds first so the page never shows one as still waiting.
    await expireHolds();
    const [bookings, drafts, settings, active] = await Promise.all([
      prisma.decemberBooking.findMany({ select: BOOKING_FIELDS, orderBy: { slotStart: "asc" }, take: 500 }),
      prisma.decemberDraft.findMany({
        where: { bookedAt: null },
        select: { id: true, name: true, email: true, whatsapp: true, country: true, step: true, brief: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 200
      }),
      getSettings(),
      activeBookingCount()
    ]);
    return NextResponse.json({ success: true, data: { bookings, drafts, settings, active, mode: bookingMode() } });
  } catch (err) {
    console.error("[December admin] Load failed", err);
    return NextResponse.json({ success: false, error: "Failed to load" }, { status: 500 });
  }
}
