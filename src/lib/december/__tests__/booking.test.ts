/**
 * @jest-environment node
 */
import { createBooking, expireHolds, findBooking, rescheduleBooking, setPaid } from "../booking";
import * as google from "../google-calendar";
import * as notify from "../notify";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    siteSettings: { findMany: jest.fn() },
    decemberBooking: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn()
    },
    decemberDraft: { updateMany: jest.fn() }
  }
}));

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
  db.create.mockImplementation(async ({ data }) => ({ id: "b1", ...data }));
  // Like Prisma, an update returns the whole row: the one just created, if any.
  db.update.mockImplementation(async ({ where, data }) => ({
    id: where.id,
    ...input,
    ...(db.create.mock.calls.at(-1)?.[0].data ?? {}),
    ...data
  }));
  db.delete.mockResolvedValue({});
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

  it("requires consent and a valid WhatsApp number", async () => {
    await expect(createBooking({ ...input, consent: false }, "x", NOW)).rejects.toMatchObject({ status: 400 });
    await expect(createBooking({ ...input, whatsapp: "123" }, "x", NOW)).rejects.toMatchObject({ status: 400 });
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
    expect(db.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { status: "paid", paidAt: NOW, holdExpiresAt: null } });
    expect(updated.status).toBe("paid");
    expect(notify.notifyPaid).toHaveBeenCalledTimes(1);
  });

  it("does not mark paid when the invite can't be sent", async () => {
    db.findUnique.mockResolvedValue(held);
    g.inviteAttendee.mockRejectedValue(new google.CalendarError("Google Calendar 503", 503));
    await expect(setPaid("b1", true, NOW)).rejects.toBeInstanceOf(google.CalendarError);
    expect(db.update).not.toHaveBeenCalled();
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
    expect(db.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { status: "paid", paidAt: NOW } });
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
