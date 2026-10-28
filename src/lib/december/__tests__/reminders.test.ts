/**
 * @jest-environment node
 */
import { sendDueReminders } from "../reminders";
import * as emails from "../emails";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: { decemberBooking: { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() } }
}));
jest.mock("../emails", () => ({ sendReminder: jest.fn() }));
jest.mock("../google-calendar", () => ({ calendarConfig: jest.fn(() => ({ subject: "book@grwtee.com" })) }));

const db = prisma.decemberBooking as unknown as Record<string, jest.Mock>;
const send = emails.sendReminder as jest.Mock;
const NOW = new Date("2026-12-01T07:00:00Z");

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  db.update.mockResolvedValue({});
  db.updateMany.mockResolvedValue({ count: 1 });
});

it("asks only for active, unreminded calls in the next 36 hours booked at least 12 hours ago", async () => {
  db.findMany.mockResolvedValue([]);
  await sendDueReminders(NOW);
  expect(db.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        status: { in: ["scheduled", "paid"] },
        reminder24hAt: null,
        slotStart: { gt: NOW, lte: new Date("2026-12-02T19:00:00Z") },
        createdAt: { lte: new Date("2026-11-30T19:00:00Z") }
      }
    })
  );
});

it("claims each reminder before sending, and gives failed ones back for the next run (WEB-19)", async () => {
  db.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
  send.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  const result = await sendDueReminders(NOW);
  expect(result).toEqual({ sent: 1, failed: 1, skipped: 0 });
  expect(db.updateMany).toHaveBeenNthCalledWith(1, { where: { id: "a", reminder24hAt: null }, data: { reminder24hAt: NOW } });
  expect(db.updateMany.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0]);
  expect(db.updateMany).toHaveBeenLastCalledWith({ where: { id: "b", reminder24hAt: NOW }, data: { reminder24hAt: null } });
});

it("skips a reminder another run already claimed", async () => {
  db.findMany.mockResolvedValue([{ id: "a" }]);
  db.updateMany.mockResolvedValueOnce({ count: 0 });
  const result = await sendDueReminders(NOW);
  expect(result).toEqual({ sent: 0, failed: 0, skipped: 1 });
  expect(send).not.toHaveBeenCalled();
});

describe("reminder wording (WEB-19)", () => {
  const { callDay, reminderEmail } = jest.requireActual<typeof import("../emails")>("../emails");
  const booking = (slotStart: string, timezone = "Africa/Lagos") =>
    ({ id: "x", name: "Ada", email: "ada@example.com", slotStart: new Date(slotStart), slotEnd: new Date(slotStart), timezone, meetUrl: null }) as never;

  it("says today for a call later the same day, in the client's timezone", () => {
    expect(callDay(new Date("2026-12-01T15:00:00Z"), NOW, "Africa/Lagos")).toBe("today");
    expect(reminderEmail(booking("2026-12-01T15:00:00Z"), NOW).subject).toBe("Today: your GRWTEE consultation");
  });

  it("says tomorrow for a call the next day", () => {
    expect(callDay(new Date("2026-12-02T10:00:00Z"), NOW, "Africa/Lagos")).toBe("tomorrow");
  });

  it("uses the client's own date: 23:30 in London is already the next day in Lagos", () => {
    const lateNight = new Date("2026-12-01T23:30:00Z");
    expect(callDay(lateNight, NOW, "Europe/London")).toBe("today");
    expect(callDay(lateNight, NOW, "Africa/Lagos")).toBe("tomorrow");
  });
});
