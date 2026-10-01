import { createHash, randomBytes } from "crypto";
import { isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { Prisma, type DecemberBooking } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseEmail } from "@/lib/security/email-validation";
import { generateSlots, type BusyRange, type SlotRules } from "./availability";
import { notifyBooked, notifyCancelled, notifyExpired, notifyPaid, notifyRescheduled } from "./notify";
import { eventDescription } from "./format";
import { feeLabel, getRules, getSettings } from "./settings";
import {
  CalendarError,
  calendarConfig,
  deleteEvent,
  insertEvent,
  inviteAttendee,
  moveEvent,
  queryBusy
} from "./google-calendar";

/**
 * "live": Google Calendar is configured.
 * "dry-run": local development without Google credentials; bookings are saved, no calendar events.
 * "off": production without credentials; nothing can be booked.
 */
export type BookingMode = "live" | "dry-run" | "off";

export function bookingMode(): BookingMode {
  if (calendarConfig()) return "live";
  return process.env.NODE_ENV === "production" ? "off" : "dry-run";
}

/** The page stays hidden in production until explicitly switched on. */
export function decemberEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DECEMBER_BOOKING_ENABLED === "true";
}

export class BookingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: "invalid" | "slot_taken" | "unavailable" | "not_found" | "closed" | "calendar"
  ) {
    super(message);
    this.name = "BookingError";
  }
}

// ---------------------------------------------------------------------------------------------
// Rules and open slots

async function heldRanges(from: Date, to: Date, slotMinutes: number): Promise<BusyRange[]> {
  const rows = await prisma.decemberBooking.findMany({
    where: { heldSlot: { gte: new Date(from.getTime() - slotMinutes * 60_000), lt: to } },
    select: { slotStart: true, slotEnd: true }
  });
  return rows.map((r) => ({ start: r.slotStart.toISOString(), end: r.slotEnd.toISOString() }));
}

const SLOT_CACHE_MS = 60_000;
let slotCache: { at: number; days: [string, string[]][] } | null = null;

/** Open slots as [Lagos date, ISO starts][]. Cached briefly so each visitor doesn't hit Google. */
export async function openSlots(now = new Date()): Promise<[string, string[]][]> {
  if (slotCache && now.getTime() - slotCache.at < SLOT_CACHE_MS) {
    // Drop anything that has fallen inside the notice period since it was cached.
    const rules = await getRules();
    const earliest = now.getTime() + rules.minNoticeMinutes * 60_000;
    return slotCache.days
      .map(([d, s]) => [d, s.filter((iso) => Date.parse(iso) >= earliest)] as [string, string[]])
      .filter(([, s]) => s.length);
  }
  // Before Google is asked: a lapsed hold's event would still show the time as busy.
  await expireHolds(now);
  const rules = await getRules();
  const to = new Date(now.getTime() + (rules.windowDays + 1) * 86_400_000);
  const [google, held] = await Promise.all([
    bookingMode() === "live" ? queryBusy(now, to) : Promise.resolve([]),
    heldRanges(now, to, rules.slotMinutes)
  ]);
  const days = [...generateSlots(now, rules, [...google, ...held]).entries()];
  slotCache = { at: now.getTime(), days };
  return days;
}

export function invalidateSlots() {
  slotCache = null;
}

/** Throws unless `slot` is a valid start under the rules and free in Google Calendar right now. */
async function assertBookable(slot: Date, now: Date, rules: SlotRules) {
  const valid = [...generateSlots(now, rules).values()].some((s) => s.includes(slot.toISOString()));
  if (!valid) throw new BookingError("That time is no longer available. Choose another time.", 409, "slot_taken");
  if (bookingMode() !== "live") return;
  const end = new Date(slot.getTime() + rules.slotMinutes * 60_000);
  const busy = await queryBusy(slot, end);
  if (busy.some((b) => Date.parse(b.start) < end.getTime() && Date.parse(b.end) > slot.getTime())) {
    throw new BookingError("That time was just taken. Choose another time.", 409, "slot_taken");
  }
}

// ---------------------------------------------------------------------------------------------
// Input

const text = (max: number) => z.string().trim().max(max);

export const bookingInputSchema = z.object({
  clientRef: z.string().uuid(),
  name: text(120).min(2),
  email: z.string(),
  country: z.string().refine((c) => isSupportedCountry(c), "Choose a country"),
  whatsapp: text(40),
  occasions: z.array(text(60)).max(12),
  otherOccasion: text(120),
  looks: z.union([z.literal(5), z.literal(10)]),
  events: z.array(z.object({ day: z.number().int().min(1).max(31), title: text(120).min(1) })).max(62),
  plans: text(4000),
  styleWords: z.array(text(40)).max(20),
  styleNotes: text(4000),
  styleLinks: z.array(text(500)).max(10),
  consent: z.literal(true),
  comments: text(4000),
  slotStart: z.string().datetime(),
  timezone: text(64).refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone")
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

function normaliseLink(raw: string): string | null {
  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isUniqueViolation(err: unknown, field: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  const target = (err.meta as { target?: string[] | string } | undefined)?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? "").includes(field);
}

// ---------------------------------------------------------------------------------------------
// Create, reschedule, cancel

export interface BookingResult {
  /** "pending": held until payment is confirmed, no invite yet. "scheduled": invited straight away (no fee set). */
  status: "pending" | "scheduled";
  slotStart: string;
  holdExpiresAt: string | null;
  meetUrl: string | null; // only once the client is invited
  manageUrl: string | null; // null when a retried request finds its booking already made
}

/** How long an unpaid booking holds its time before it is released. */
export const HOLD_HOURS = 24;

const ACTIVE = ["pending", "scheduled", "paid"];

const consultationSummary = (name: string) => `GRWTEE December consultation: ${name}`;

function holdLapsed(b: Pick<DecemberBooking, "status" | "holdExpiresAt">, now: Date): boolean {
  return b.status === "pending" && b.holdExpiresAt !== null && b.holdExpiresAt.getTime() <= now.getTime();
}

function siteUrlFromEnv(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://grwtee.com";
}

function result(b: DecemberBooking, manageUrl: string | null): BookingResult {
  const pending = b.status === "pending";
  return {
    status: pending ? "pending" : "scheduled",
    slotStart: b.slotStart.toISOString(),
    holdExpiresAt: b.holdExpiresAt?.toISOString() ?? null,
    meetUrl: pending ? null : b.meetUrl,
    manageUrl
  };
}

export function activeBookingCount(): Promise<number> {
  return prisma.decemberBooking.count({ where: { status: { in: ACTIVE } } });
}

async function afterBooked(booking: DecemberBooking, manageUrl: string, siteUrl: string) {
  // The draft only exists to spot people who stopped before booking.
  await prisma.decemberDraft
    .updateMany({ where: { clientRef: booking.clientRef }, data: { bookedAt: booking.createdAt } })
    .catch((err) => console.error("[December] Could not mark draft booked", err));
  notifyBooked(booking, manageUrl, siteUrl);
}

export async function createBooking(raw: unknown, siteUrl: string, now = new Date()): Promise<BookingResult> {
  const mode = bookingMode();
  if (mode === "off") throw new BookingError("Booking isn't open yet.", 503, "closed");

  const parsed = bookingInputSchema.safeParse(raw);
  if (!parsed.success) throw new BookingError("Some details are missing or invalid.", 400, "invalid");
  const input = parsed.data;
  const email = parseEmail(input.email);
  if (!email.ok) throw new BookingError(email.message, 400, "invalid");
  const phone = parsePhoneNumberFromString(input.whatsapp, input.country as CountryCode);
  if (!phone?.isValid()) throw new BookingError("Check the WhatsApp number and country code.", 400, "invalid");
  const styleLinks = input.styleLinks.filter(Boolean).map(normaliseLink);
  if (styleLinks.some((l) => l === null)) throw new BookingError("One of the links isn't valid.", 400, "invalid");

  const existing = await prisma.decemberBooking.findUnique({ where: { clientRef: input.clientRef } });
  if (existing && ACTIVE.includes(existing.status)) return result(existing, null);

  await expireHolds(now);
  const { rules, capacity, feeNgn, feeUsd } = await getSettings();
  if (capacity !== null && (await activeBookingCount()) >= capacity) {
    throw new BookingError("December is fully booked.", 409, "closed");
  }
  const slotStart = new Date(input.slotStart);
  const slotEnd = new Date(slotStart.getTime() + rules.slotMinutes * 60_000);
  await assertBookable(slotStart, now, rules);

  // With a fee set, the time is only held until payment is confirmed in admin; the invite follows.
  const hold = feeLabel({ feeNgn, feeUsd }) !== "";
  const holdExpiresAt = hold ? new Date(Math.min(now.getTime() + HOLD_HOURS * 3_600_000, slotStart.getTime())) : null;

  const token = randomBytes(24).toString("base64url");
  const manageUrl = `${siteUrl.replace(/\/$/, "")}/december/manage/${token}`;
  const data = {
    status: hold ? "pending" : "scheduled",
    clientRef: input.clientRef,
    name: input.name,
    email: email.email,
    whatsapp: phone.number,
    country: input.country,
    occasions: input.occasions,
    otherOccasion: input.occasions.includes("Other") && input.otherOccasion ? input.otherOccasion : null,
    looks: input.looks,
    events: [...input.events].sort((a, b) => a.day - b.day),
    plans: input.plans || null,
    styleWords: input.styleWords,
    styleNotes: input.styleNotes || null,
    styleLinks: styleLinks as string[],
    comments: input.comments || null,
    consentAt: now,
    timezone: input.timezone,
    slotStart,
    slotEnd,
    heldSlot: slotStart,
    googleEventId: null,
    meetUrl: null,
    manageTokenHash: hashToken(token),
    holdExpiresAt,
    paidAt: null,
    cancelledAt: null
  };

  // Claim the slot first: the unique heldSlot index makes this the single point that decides
  // who gets a time when two people book it at once.
  let booking: DecemberBooking;
  try {
    booking = await prisma.decemberBooking.create({ data });
  } catch (err) {
    if (isUniqueViolation(err, "heldSlot")) {
      throw new BookingError("That time was just taken. Choose another time.", 409, "slot_taken");
    }
    if (isUniqueViolation(err, "clientRef")) {
      throw new BookingError("This booking was already submitted.", 409, "invalid");
    }
    throw err;
  }
  invalidateSlots();

  if (mode === "dry-run") {
    console.warn("[December] Dry run: booking %s saved without a Google Calendar event", booking.id);
    await afterBooked(booking, manageUrl, siteUrl);
    return result(booking, manageUrl);
  }

  try {
    const event = await insertEvent({
      requestId: booking.id,
      start: slotStart,
      end: slotEnd,
      summary: hold ? `Awaiting payment: ${data.name}` : consultationSummary(data.name),
      description: eventDescription(data, manageUrl),
      attendee: hold ? null : { email: data.email, name: data.name }
    });
    booking = await prisma.decemberBooking.update({
      where: { id: booking.id },
      data: { googleEventId: event.id, meetUrl: event.meetUrl }
    });
    await afterBooked(booking, manageUrl, siteUrl);
    return result(booking, manageUrl);
  } catch (err) {
    // Release the slot so the client can try again straight away.
    await prisma.decemberBooking.delete({ where: { id: booking.id } }).catch((e) => {
      console.error("[December] Could not release booking %s after calendar failure", booking.id, e);
    });
    invalidateSlots();
    console.error("[December] Calendar event failed", err);
    throw new BookingError("We couldn't reach the calendar. Try again in a moment.", 502, "calendar");
  }
}

export async function findBooking(token: string, now = new Date()): Promise<(DecemberBooking & { canChange: boolean }) | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const booking = await prisma.decemberBooking.findUnique({ where: { manageTokenHash: hashToken(token) } });
  if (!booking) return null;
  // A lapsed hold reads as expired even before the sweep has released it.
  const status = holdLapsed(booking, now) ? "expired" : booking.status;
  return { ...booking, status, canChange: ACTIVE.includes(status) && booking.slotStart.getTime() > now.getTime() };
}

async function requireChangeable(token: string, now: Date) {
  const booking = await findBooking(token, now);
  if (!booking) throw new BookingError("Booking not found.", 404, "not_found");
  if (!booking.canChange) throw new BookingError("This booking can no longer be changed.", 409, "closed");
  return booking;
}

export async function rescheduleBooking(
  token: string,
  newStartIso: string,
  siteUrl: string,
  now = new Date()
): Promise<{ slotStart: string }> {
  if (bookingMode() === "off") throw new BookingError("Booking isn't open yet.", 503, "closed");
  const booking = await requireChangeable(token, now);
  const start = new Date(newStartIso);
  if (Number.isNaN(start.getTime())) throw new BookingError("Choose a time.", 400, "invalid");
  if (start.getTime() === booking.slotStart.getTime()) return { slotStart: start.toISOString() };

  await expireHolds(now);
  const rules = await getRules();
  const end = new Date(start.getTime() + rules.slotMinutes * 60_000);
  await assertBookable(start, now, rules);

  try {
    await prisma.decemberBooking.update({ where: { id: booking.id }, data: { heldSlot: start } });
  } catch (err) {
    if (isUniqueViolation(err, "heldSlot")) {
      throw new BookingError("That time was just taken. Choose another time.", 409, "slot_taken");
    }
    throw err;
  }
  invalidateSlots();

  try {
    if (booking.googleEventId) await moveEvent(booking.googleEventId, start, end);
  } catch (err) {
    await prisma.decemberBooking
      .update({ where: { id: booking.id }, data: { heldSlot: booking.slotStart } })
      .catch((e) => console.error("[December] Could not restore slot for %s", booking.id, e));
    invalidateSlots();
    console.error("[December] Calendar move failed", err);
    throw new BookingError("We couldn't reach the calendar. Try again in a moment.", 502, "calendar");
  }
  const updated = await prisma.decemberBooking.update({
    where: { id: booking.id },
    // A moved call needs a fresh reminder. A hold never outlasts the call it is holding.
    data: {
      slotStart: start,
      slotEnd: end,
      reminder24hAt: null,
      ...(booking.holdExpiresAt && { holdExpiresAt: new Date(Math.min(booking.holdExpiresAt.getTime(), start.getTime())) })
    }
  });
  notifyRescheduled(updated, booking.slotStart, siteUrl);
  return { slotStart: start.toISOString() };
}

async function releaseBooking(booking: DecemberBooking, now: Date): Promise<DecemberBooking> {
  if (booking.googleEventId) {
    try {
      await deleteEvent(booking.googleEventId);
    } catch (err) {
      console.error("[December] Calendar delete failed", err);
      throw new BookingError("We couldn't reach the calendar. Try again in a moment.", 502, "calendar");
    }
  }
  const cancelled = await prisma.decemberBooking.update({
    where: { id: booking.id },
    data: { status: "cancelled", heldSlot: null, cancelledAt: now }
  });
  invalidateSlots();
  return cancelled;
}

/**
 * Releases holds whose payment window has lapsed: deletes the held event, frees the time and
 * emails the client and stylist. Runs before slots are read or claimed, when the admin page
 * loads and from the daily cron, so a lapsed hold never blocks a time. Never throws.
 */
export async function expireHolds(now = new Date()): Promise<number> {
  let released = 0;
  try {
    const due = await prisma.decemberBooking.findMany({ where: { status: "pending", holdExpiresAt: { lte: now } } });
    for (const booking of due) {
      try {
        // The held event has no guests, so deleting it emails nobody.
        if (booking.googleEventId) await deleteEvent(booking.googleEventId);
        // Conditional, so two overlapping sweeps can't both email the client.
        const { count } = await prisma.decemberBooking.updateMany({
          where: { id: booking.id, status: "pending" },
          data: { status: "expired", heldSlot: null, cancelledAt: now }
        });
        if (count) {
          released++;
          notifyExpired({ ...booking, status: "expired", heldSlot: null, cancelledAt: now }, siteUrlFromEnv());
        }
      } catch (err) {
        console.error("[December] Could not release lapsed hold %s", booking.id, err);
      }
    }
  } catch (err) {
    console.error("[December] Hold sweep failed", err);
  }
  if (released) invalidateSlots();
  return released;
}

export async function cancelBooking(token: string, siteUrl: string, now = new Date()): Promise<void> {
  const booking = await requireChangeable(token, now);
  notifyCancelled(await releaseBooking(booking, now), siteUrl);
}

// ---------------------------------------------------------------------------------------------
// Admin

/** Cancels from the admin page. Google emails the client the cancellation; no stylist email. */
export async function adminCancelBooking(id: string, now = new Date()): Promise<DecemberBooking> {
  const booking = await prisma.decemberBooking.findUnique({ where: { id } });
  if (!booking) throw new BookingError("Booking not found.", 404, "not_found");
  if (!ACTIVE.includes(booking.status)) throw new BookingError("This booking is already cancelled.", 409, "closed");
  return releaseBooking(booking, now);
}

/**
 * Marks a booking paid or unpaid. Paying a held booking sends the client their calendar invite
 * (Google emails it with the Meet link) and a payment confirmation. Marking unpaid keeps the
 * invite: the booking goes back to "scheduled", not to a hold.
 */
export async function setPaid(id: string, paid: boolean, now = new Date()): Promise<DecemberBooking> {
  const booking = await prisma.decemberBooking.findUnique({ where: { id } });
  if (!booking) throw new BookingError("Booking not found.", 404, "not_found");
  if (holdLapsed(booking, now)) {
    throw new BookingError("The 24-hour hold has lapsed and the time was released.", 409, "closed");
  }
  if (!ACTIVE.includes(booking.status)) throw new BookingError("This booking is no longer active.", 409, "closed");

  if (!paid) {
    if (booking.status !== "paid") return booking;
    return prisma.decemberBooking.update({ where: { id }, data: { status: "scheduled", paidAt: null } });
  }
  if (booking.status === "paid") return booking;
  if (booking.status === "scheduled") {
    return prisma.decemberBooking.update({ where: { id }, data: { status: "paid", paidAt: now } });
  }

  if (booking.googleEventId) {
    await inviteAttendee(booking.googleEventId, {
      summary: consultationSummary(booking.name),
      email: booking.email,
      name: booking.name
    });
  }
  const updated = await prisma.decemberBooking.update({
    where: { id },
    data: { status: "paid", paidAt: now, holdExpiresAt: null }
  });
  notifyPaid(updated);
  return updated;
}

/** Maps service errors to a JSON response body and status; anything unexpected is a 500. */
export function toErrorResponse(err: unknown): { status: number; body: { success: false; error: string; code?: string } } {
  if (err instanceof BookingError) return { status: err.status, body: { success: false, error: err.message, code: err.code } };
  if (err instanceof CalendarError) {
    console.error("[December]", err);
    return { status: 502, body: { success: false, error: "We couldn't reach the calendar. Try again in a moment.", code: "calendar" } };
  }
  console.error("[December]", err);
  return { status: 500, body: { success: false, error: "Something went wrong. Please try again." } };
}
