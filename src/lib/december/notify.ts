import { after } from "next/server";
import type { DecemberBooking } from "@prisma/client";
import { notifyStylist, sendConfirmation } from "./emails";
import { calendarConfig } from "./google-calendar";

/**
 * Booking emails run after the response is sent, so a slow or failing email never delays or
 * undoes a booking. Without Google credentials (local dry-run) they're logged instead of sent.
 */

function emailsLive(): boolean {
  return Boolean(calendarConfig()) || process.env.NODE_ENV === "production";
}

function background(label: string, task: () => Promise<unknown>) {
  if (!emailsLive()) {
    console.info("[December] Dry run: skipped %s email", label);
    return;
  }
  const run = async () => {
    try {
      await task();
    } catch (err) {
      console.error("[December] %s email failed", label, err);
    }
  };
  try {
    after(run);
  } catch {
    // Outside a request (scripts, tests): send inline.
    void run();
  }
}

export function notifyBooked(booking: DecemberBooking, manageUrl: string, siteUrl: string) {
  background("booking", async () => {
    await Promise.all([sendConfirmation(booking, manageUrl), notifyStylist(booking, { kind: "booked" }, siteUrl)]);
  });
}

export function notifyRescheduled(booking: DecemberBooking, previousStart: Date, siteUrl: string) {
  background("reschedule", () => notifyStylist(booking, { kind: "rescheduled", previousStart }, siteUrl));
}

export function notifyCancelled(booking: DecemberBooking, siteUrl: string) {
  background("cancel", () => notifyStylist(booking, { kind: "cancelled" }, siteUrl));
}
