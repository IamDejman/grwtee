import { prisma } from "@/lib/prisma";
import { sendReminder } from "./emails";
import { calendarConfig } from "./google-calendar";

/**
 * Daily job (Vercel Cron, 07:00 UTC = 08:00 Lagos): emails everyone whose call is in the next
 * 36 hours and hasn't been reminded. Run at 08:00 Lagos, that's every call before 20:00 tomorrow,
 * which covers the whole booking day. Calls booked less than a day ahead are skipped: they just
 * got the confirmation.
 */
export async function sendDueReminders(now = new Date()): Promise<{ sent: number; failed: number; skipped: number }> {
  const due = await prisma.decemberBooking.findMany({
    where: {
      status: { in: ["scheduled", "paid"] },
      reminder24hAt: null,
      slotStart: { gt: now, lte: new Date(now.getTime() + 36 * 3_600_000) },
      createdAt: { lte: new Date(now.getTime() - 12 * 3_600_000) }
    },
    orderBy: { slotStart: "asc" }
  });

  if (!calendarConfig() && process.env.NODE_ENV !== "production") {
    console.info("[December] Dry run: %d reminders due, none sent", due.length);
    return { sent: 0, failed: 0, skipped: due.length };
  }

  let sent = 0;
  let failed = 0;
  for (const booking of due) {
    if (await sendReminder(booking)) {
      await prisma.decemberBooking.update({ where: { id: booking.id }, data: { reminder24hAt: now } });
      sent++;
    } else {
      failed++;
    }
  }
  return { sent, failed, skipped: 0 };
}
