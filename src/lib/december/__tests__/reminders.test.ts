/**
 * @jest-environment node
 */
import { sendDueReminders } from "../reminders";
import * as emails from "../emails";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: { decemberBooking: { findMany: jest.fn(), update: jest.fn() } }
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

it("marks sent reminders and leaves failed ones for the next run", async () => {
  db.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
  send.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  const result = await sendDueReminders(NOW);
  expect(result).toEqual({ sent: 1, failed: 1, skipped: 0 });
  expect(db.update).toHaveBeenCalledTimes(1);
  expect(db.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { reminder24hAt: NOW } });
});
