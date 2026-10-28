/**
 * @jest-environment node
 */
import { createBooking, expireHolds, findBooking, releaseUnpaidHolds, rescheduleBooking, setPaid } from "../booking";
import * as google from "../google-calendar";
import * as notify from "../notify";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => {
  const prisma: Record<string, unknown> = {
    siteSettings: { findMany: jest.fn() },
    decemberBooking: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn()
    },
    decemberDraft: { updateMany: jest.fn() },
    $executeRaw: jest.fn(async () => 0)
  };
  // The transaction's client is the same mock.
  prisma.$transaction = jest.fn(async (run: (tx: unknown) => unknown) => run(prisma));
  return { prisma };
});

jest.mock("../notify", () => ({
  notifyBooked: jest.fn(),
  notifyRescheduled: jest.fn(),
  notifyCancelled: jest.fn(),
  notifyPaid: jest.fn(),
  notifyExpired: jest.fn()
}));

jest.mock("../google-calendar", () => {
  const actual = jest.requireActual("../google-calendar");
  return {
    ...actual,
    calendarConfig: jest.fn(() => ({ clientEmail: "sa", privateKey: "k", subject: "book@grwtee.com", busyCalendars: ["primary"] })),
    queryBusy: jest.fn(),
    insertEvent: jest.fn(),
    inviteAttendee: jest.fn(),
    moveEvent: jest.fn(),
    deleteEvent: jest.fn()
  };
});

const db = prisma.decemberBooking as unknown as Record<string, jest.Mock>;
const g = google as unknown as Record<string, jest.Mock>;

// Monday 5 Oct 2026 06:00 Lagos; 11:00 Lagos (10:00Z) is a valid slot under the default rules.
const NOW = new Date("2026-10-05T05:00:00Z");
const SLOT = "2026-10-05T10:00:00.000Z";

const input = {
  clientRef: "22222222-2222-4222-8222-222222222222",
  name: "Ada Obi",
  email: "ada@example.com",
  country: "NG",
  whatsapp: "0803 123 4567",
  occasions: ["Concerts"],
  otherOccasion: "",
  looks: 5,
  events: [{ day: 20, title: "Burna Boy concert" }],
  plans: "",
  styleWords: ["Glamorous"],
  styleNotes: "",
  styleLinks: [],
  consent: true,
  comments: "",
  slotStart: SLOT,
  timezone: "Africa/Lagos"
};

beforeEach(() => {
  jest.clearAllMocks();
  // Failure paths log by design; keep test output readable.
  jest.spyOn(console, "error").mockImplementation(() => {});
  (prisma.siteSettings.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.decemberDraft.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  db.count.mockResolvedValue(0);
  db.findMany.mockResolvedValue([]);
  db.updateMany.mockResolvedValue({ count: 1 });
  db.findUnique.mockResolvedValue(null);
  db.findFirst.mockResolvedValue(null);
  db.create.mockImplementation(async ({ data }) => ({ id: "b1", ...data }));
  // Like Prisma, an update returns the whole row: the one just created, if any.
  db.update.mockImplementation(async ({ where, data }) => ({
    id: where.id,
    ...input,
    ...(db.create.mock.calls.at(-1)?.[0].data ?? {}),
    ...data
  }));
  db.delete.mockResolvedValue({});
  // The row after a conditional update: as findUnique returns it, with that update's changes.
  db.findUniqueOrThrow.mockImplementation(async (args) => ({
    ...(await db.findUnique(args)),
    ...(db.updateMany.mock.calls.at(-1)?.[0].data ?? {})
  }));
  g.queryBusy.mockResolvedValue([]);
});

describe("createBooking (live calendar)", () => {
  it("creates the Google event with the brief and manage link, and stores the Meet link", async () => {
    g.insertEvent.mockResolvedValue({ id: "evt1", meetUrl: "https://meet.google.com/abc" });
    const result = await createBooking(input, "https://grwtee.com", NOW);

    expect(result.meetUrl).toBe("https://meet.google.com/abc");
    expect(result.manageUrl).toMatch(/^https:\/\/grwtee\.com\/december\/manage\/[A-Za-z0-9_-]{32}$/);
    const event = g.insertEvent.mock.calls[0][0];
    expect(event.attendee).toEqual({ email: "ada@example.com", name: "Ada Obi" });
    expect(result.status).toBe("scheduled");
    expect(event.description).toContain("20 Dec: Burna Boy concert");
    expect(event.description).toContain(result.manageUrl);
    expect(event.description).toContain("WhatsApp: +2348031234567");
    expect(db.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { googleEventId: "evt1", meetUrl: "https://meet.google.com/abc" }
    });
    // Only a hash of the manage token is stored.
    expect(db.create.mock.calls[0][0].data.manageTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.manageUrl).not.toContain(db.create.mock.calls[0][0].data.manageTokenHash);
  });

  it("rejects a slot that is busy in Google Calendar without saving anything", async () => {
    g.queryBusy.mockResolvedValue([{ start: "2026-10-05T09:45:00Z", end: "2026-10-05T10:15:00Z" }]);
    await expect(createBooking(input, "https://grwtee.com", NOW)).rejects.toMatchObject({ status: 409, code: "slot_taken" });
    expect(db.create).not.toHaveBeenCalled();
  });

  it("releases the slot when Google fails to create the event", async () => {
    g.insertEvent.mockRejectedValue(new google.CalendarError("Google Calendar 500", 500));
    await expect(createBooking(input, "https://grwtee.com", NOW)).rejects.toMatchObject({ status: 502, code: "calendar" });
    expect(db.delete).toHaveBeenCalledWith({ where: { id: "b1" } });
  });

  it("rejects times outside the rules (inside the notice period)", async () => {
    await expect(
      createBooking({ ...input, slotStart: "2026-10-05T05:30:00.000Z" }, "https://grwtee.com", NOW)
    ).rejects.toMatchObject({ status: 409 });
    expect(g.queryBusy).not.toHaveBeenCalled();
  });

  it("allows one active booking per email address and per WhatsApp number", async () => {
    db.findFirst.mockResolvedValue({ id: "earlier" });
    await expect(createBooking(input, "https://grwtee.com", NOW)).rejects.toMatchObject({ status: 409, code: "duplicate" });
    expect(db.findFirst).toHaveBeenCalledWith({
      where: {
        status: { in: ["pending", "scheduled", "paid"] },
        OR: [{ email: "ada@example.com" }, { whatsapp: "+2348031234567" }]
      },
      select: { id: true }
    });
    expect(db.create).not.toHaveBeenCalled();
    expect(g.insertEvent).not.toHaveBeenCalled();
  });

  it("checks capacity and the per-person rule behind a lock, in the same transaction as the insert (WEB-19)", async () => {
    g.insertEvent.mockResolvedValue({ id: "evt1", meetUrl: null });
    await createBooking(input, "https://grwtee.com", NOW);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalled();
    const lockOrder = (prisma.$executeRaw as jest.Mock).mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(db.findFirst.mock.invocationCallOrder[0]);
    expect(db.findFirst.mock.invocationCallOrder[0]).toBeLessThan(db.create.mock.invocationCallOrder[0]);
  });

  it("requires consent and a valid WhatsApp number", async () => {
    await expect(createBooking({ ...input, consent: false }, "x", NOW)).rejects.toMatchObject({ status: 400 });
    await expect(createBooking({ ...input, whatsapp: "123" }, "x", NOW)).rejects.toMatchObject({ status: 400 });
  });

  it("says which field to fix when the brief is rejected", async () => {
    const events = [{ day: 20, title: "x".repeat(121) }];
    await expect(createBooking({ ...input, events }, "x", NOW)).rejects.toMatchObject({
      status: 400,
      code: "invalid",
      message: "Go back and shorten the description on one of your December dates, then try again."
    });
    await expect(createBooking({ ...input, country: "" }, "x", NOW)).rejects.toMatchObject({
      message: "Go back and check your country code, then try again."
    });
    expect(db.create).not.toHaveBeenCalled();
  });
});

describe("rescheduleBooking (live calendar)", () => {
  const booked = {
    id: "b1",
    status: "scheduled",
    slotStart: new Date(SLOT),
    slotEnd: new Date("2026-10-05T10:30:00Z"),
    googleEventId: "evt1"
  };

  it("puts the old slot back when Google fails to move the event", async () => {
    db.findUnique.mockResolvedValue(booked);
    g.moveEvent.mockRejectedValue(new google.CalendarError("Google Calendar 503", 503));
    await expect(rescheduleBooking("a".repeat(32), "2026-10-06T10:00:00.000Z", "https://grwtee.com", NOW)).rejects.toMatchObject({ status: 502 });
    expect(db.update).toHaveBeenNthCalledWith(1, { where: { id: "b1" }, data: { heldSlot: new Date("2026-10-06T10:00:00.000Z") } });
    expect(db.update).toHaveBeenNthCalledWith(2, { where: { id: "b1" }, data: { heldSlot: booked.slotStart } });
  });
});

describe("createBooking: capacity, drafts and emails", () => {
  it("refuses new bookings once capacity is reached", async () => {
    (prisma.siteSettings.findMany as jest.Mock).mockResolvedValue([{ key: "december_capacity", value: "3" }]);
    db.count.mockResolvedValue(3);
    await expect(createBooking(input, "https://grwtee.com", NOW)).rejects.toMatchObject({ status: 409, code: "closed" });
    expect(db.create).not.toHaveBeenCalled();
  });

  it("books below capacity, marks the draft booked and sends emails", async () => {
    (prisma.siteSettings.findMany as jest.Mock).mockResolvedValue([{ key: "december_capacity", value: "3" }]);
    db.count.mockResolvedValue(2);
    g.insertEvent.mockResolvedValue({ id: "evt", meetUrl: "https://meet.google.com/abc" });
    const result = await createBooking(input, "https://grwtee.com", NOW);
    expect(prisma.decemberDraft.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientRef: input.clientRef } })
    );
    expect(notify.notifyBooked).toHaveBeenCalledWith(
      expect.objectContaining({ googleEventId: "evt", meetUrl: "https://meet.google.com/abc" }),
      result.manageUrl,
      "https://grwtee.com"
    );
  });

  it("sends no emails when the calendar fails", async () => {
    g.insertEvent.mockRejectedValue(new Error("down"));
    await expect(createBooking(input, "https://grwtee.com", NOW)).rejects.toMatchObject({ status: 502 });
    expect(notify.notifyBooked).not.toHaveBeenCalled();
  });
});

describe("pay to confirm: holds, payment and expiry", () => {
  const FEE = [{ key: "december_fee_ngn", value: "50000" }];
  // Tuesday 6 Oct, 11:00 Lagos: more than 24 hours after NOW.
  const LATER = "2026-10-06T10:00:00.000Z";

  const held = {
    id: "b1",
    ...input,
    status: "pending",
    slotStart: new Date(LATER),
    slotEnd: new Date("2026-10-06T10:30:00Z"),
    googleEventId: "evt1",
    meetUrl: "https://meet.google.com/abc",
    holdExpiresAt: new Date("2026-10-06T05:00:00Z")
  };

  beforeEach(() => {
    (prisma.siteSettings.findMany as jest.Mock).mockResolvedValue(FEE);
  });

  it("with a fee set, holds the time for 24 hours with no guest on the event and no Meet link for the client", async () => {
    g.insertEvent.mockResolvedValue({ id: "evt1", meetUrl: "https://meet.google.com/abc" });
    const result = await createBooking({ ...input, slotStart: LATER }, "https://grwtee.com", NOW);

    const data = db.create.mock.calls[0][0].data;
    expect(data.status).toBe("pending");
    expect(data.holdExpiresAt).toEqual(new Date("2026-10-06T05:00:00Z"));
    const event = g.insertEvent.mock.calls[0][0];
    expect(event.attendee).toBeNull();
    expect(event.summary).toBe("Awaiting payment: Ada Obi");
    expect(result).toMatchObject({ status: "pending", meetUrl: null, holdExpiresAt: "2026-10-06T05:00:00.000Z" });
    expect(notify.notifyBooked).toHaveBeenCalledWith(expect.objectContaining({ status: "pending" }), result.manageUrl, "https://grwtee.com");
  });

  it("never holds past the call itself", async () => {
    g.insertEvent.mockResolvedValue({ id: "evt1", meetUrl: null });
    await createBooking(input, "https://grwtee.com", NOW);
    expect(db.create.mock.calls[0][0].data.holdExpiresAt).toEqual(new Date(SLOT));
  });

  it("marking a hold paid invites the client and sends the payment confirmation", async () => {
    db.findUnique.mockResolvedValue(held);
    const updated = await setPaid("b1", true, NOW);
    expect(g.inviteAttendee).toHaveBeenCalledWith("evt1", {
      summary: "GRWTEE December consultation: Ada Obi",
      email: "ada@example.com",
      name: "Ada Obi"
    });
    // Only while it's still a hold with its slot, so the hold sweep can't release it underneath (WEB-19).
    expect(db.updateMany).toHaveBeenCalledWith({
      where: { id: "b1", status: "pending", heldSlot: { not: null } },
      data: { status: "paid", paidAt: NOW, holdExpiresAt: null }
    });
    expect(db.updateMany.mock.invocationCallOrder[0]).toBeLessThan(g.inviteAttendee.mock.invocationCallOrder[0]);
    expect(updated.status).toBe("paid");
    expect(notify.notifyPaid).toHaveBeenCalledTimes(1);
  });

  it("refuses when the hold was released while marking paid, and sends no invite", async () => {
    db.findUnique.mockResolvedValue(held);
    db.updateMany.mockResolvedValue({ count: 0 });
    await expect(setPaid("b1", true, NOW)).rejects.toMatchObject({ status: 409 });
    expect(g.inviteAttendee).not.toHaveBeenCalled();
    expect(notify.notifyPaid).not.toHaveBeenCalled();
  });

  it("puts the hold back when the invite can't be sent", async () => {
    db.findUnique.mockResolvedValue(held);
    g.inviteAttendee.mockRejectedValue(new google.CalendarError("Google Calendar 503", 503));
    await expect(setPaid("b1", true, NOW)).rejects.toBeInstanceOf(google.CalendarError);
    expect(db.updateMany).toHaveBeenLastCalledWith({
      where: { id: "b1", status: "paid" },
      data: { status: "pending", paidAt: null, holdExpiresAt: held.holdExpiresAt }
    });
    expect(notify.notifyPaid).not.toHaveBeenCalled();
  });

  it("refuses to mark a lapsed hold paid", async () => {
    db.findUnique.mockResolvedValue(held);
    await expect(setPaid("b1", true, new Date("2026-10-06T05:00:00Z"))).rejects.toMatchObject({ status: 409 });
    expect(g.inviteAttendee).not.toHaveBeenCalled();
  });

  it("marking an already-invited booking paid sends no second invite", async () => {
    db.findUnique.mockResolvedValue({ ...held, status: "scheduled", holdExpiresAt: null });
    await setPaid("b1", true, NOW);
    expect(g.inviteAttendee).not.toHaveBeenCalled();
    expect(notify.notifyPaid).not.toHaveBeenCalled();
    expect(db.updateMany).toHaveBeenCalledWith({
      where: { id: "b1", status: "scheduled", heldSlot: { not: null } },
      data: { status: "paid", paidAt: NOW }
    });
  });

  it("releases lapsed holds: deletes the event, frees the slot and tells the client once", async () => {
    const at = new Date("2026-10-06T05:00:00Z");
    db.findMany.mockResolvedValue([held]);
    await expect(expireHolds(at)).resolves.toBe(1);
    expect(db.findMany).toHaveBeenCalledWith({ where: { status: "pending", holdExpiresAt: { lte: at } } });
    expect(g.deleteEvent).toHaveBeenCalledWith("evt1");
    expect(db.updateMany).toHaveBeenCalledWith({
      where: { id: "b1", status: "pending" },
      data: { status: "expired", heldSlot: null, cancelledAt: at }
    });
    expect(notify.notifyExpired).toHaveBeenCalledWith(expect.objectContaining({ id: "b1", status: "expired" }), expect.any(String));

    // A second sweep that loses the race sends nothing.
    jest.clearAllMocks();
    db.findMany.mockResolvedValue([held]);
    db.updateMany.mockResolvedValue({ count: 0 });
    await expect(expireHolds(at)).resolves.toBe(0);
    expect(notify.notifyExpired).not.toHaveBeenCalled();
  });

  it("keeps the hold when Google can't delete the event, and never throws", async () => {
    db.findMany.mockResolvedValue([held]);
    g.deleteEvent.mockRejectedValue(new google.CalendarError("Google Calendar 500", 500));
    await expect(expireHolds(new Date("2026-10-07T00:00:00Z"))).resolves.toBe(0);
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it("shows a lapsed hold as expired on the manage page before the sweep runs", async () => {
    db.findUnique.mockResolvedValue(held);
    const booking = await findBooking("a".repeat(32), new Date("2026-10-06T06:00:00Z"));
    expect(booking).toMatchObject({ status: "expired", canChange: false });
  });
});

describe("releaseUnpaidHolds", () => {
  it("releases only the holds it was given that are still unpaid, and carries on past a calendar failure", async () => {
    db.findMany.mockResolvedValue([
      { id: "h1", status: "pending", googleEventId: "e1" },
      { id: "h2", status: "pending", googleEventId: "e2" }
    ]);
    g.deleteEvent.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new google.CalendarError("Google Calendar 500", 500));

    const result = await releaseUnpaidHolds(["h1", "h2", "paid-one"], NOW);

    expect(db.findMany).toHaveBeenCalledWith({ where: { id: { in: ["h1", "h2", "paid-one"] }, status: "pending" } });
    expect(result).toEqual({ released: 1, failed: 1 });
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: { status: "cancelled", heldSlot: null, cancelledAt: NOW }
    });
    // Nobody is emailed: held events have no guests.
    expect(notify.notifyCancelled).not.toHaveBeenCalled();
    expect(notify.notifyExpired).not.toHaveBeenCalled();
  });
});
