/**
 * @jest-environment node
 */
import { createBooking, rescheduleBooking } from "../booking";
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
      delete: jest.fn()
    },
    decemberDraft: { updateMany: jest.fn() }
  }
}));

jest.mock("../notify", () => ({
  notifyBooked: jest.fn(),
  notifyRescheduled: jest.fn(),
  notifyCancelled: jest.fn()
}));

jest.mock("../google-calendar", () => {
  const actual = jest.requireActual("../google-calendar");
  return {
    ...actual,
    calendarConfig: jest.fn(() => ({ clientEmail: "sa", privateKey: "k", subject: "book@grwtee.com", busyCalendars: ["primary"] })),
    queryBusy: jest.fn(),
    insertEvent: jest.fn(),
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
  db.findUnique.mockResolvedValue(null);
  db.create.mockImplementation(async ({ data }) => ({ id: "b1", ...data }));
  db.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...input, ...data }));
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
    expect(event.attendeeEmail).toBe("ada@example.com");
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
