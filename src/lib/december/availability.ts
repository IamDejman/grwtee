/**
 * Consultation slot rules, mirrored from the Calendly event this flow replaces.
 * Hours are in Lagos time (Africa/Lagos, UTC+1 all year, no DST).
 * Pure functions so the same code can run on the server once Google Calendar is wired.
 */
export interface SlotRules {
  weekdays: number[]; // 0 = Sunday
  startHour: number; // Lagos time
  endHour: number; // last slot ends here
  slotMinutes: number;
  minNoticeMinutes: number;
  windowDays: number;
  lastDate: string | null; // last day calls can take place, Lagos YYYY-MM-DD
}

export interface BusyRange {
  start: string; // ISO
  end: string; // ISO
}

export const DEFAULT_RULES: SlotRules = {
  weekdays: [1, 2, 3, 4, 5],
  startHour: 11,
  endHour: 15,
  slotMinutes: 30,
  minNoticeMinutes: 4 * 60,
  windowDays: 60,
  // December itself is for styling, not consultations.
  lastDate: "2026-11-27"
};

const LAGOS_UTC_OFFSET_HOURS = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

function lagosDay(t: number): string {
  return new Date(t + LAGOS_UTC_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

/** True once the last booking day has passed in Lagos. */
export function bookingClosed(now: Date, rules: SlotRules = DEFAULT_RULES): boolean {
  return rules.lastDate !== null && lagosDay(now.getTime()) > rules.lastDate;
}

/** Open slot start times (ISO UTC), grouped by Lagos calendar date (YYYY-MM-DD). */
export function generateSlots(
  now: Date,
  rules: SlotRules = DEFAULT_RULES,
  busy: BusyRange[] = []
): Map<string, string[]> {
  const earliest = now.getTime() + rules.minNoticeMinutes * 60_000;
  const busyMs = busy.map((b) => [Date.parse(b.start), Date.parse(b.end)] as const);
  const slotMs = rules.slotMinutes * 60_000;

  // Lagos "today" at midnight, expressed in UTC ms.
  const lagosNow = new Date(now.getTime() + LAGOS_UTC_OFFSET_HOURS * 3_600_000);
  const lagosMidnightUtc =
    Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate()) -
    LAGOS_UTC_OFFSET_HOURS * 3_600_000;

  const days = new Map<string, string[]>();
  for (let d = 0; d < rules.windowDays; d++) {
    const dayStart = lagosMidnightUtc + d * DAY_MS;
    const lagosDate = new Date(dayStart + LAGOS_UTC_OFFSET_HOURS * 3_600_000);
    if (rules.lastDate !== null && lagosDate.toISOString().slice(0, 10) > rules.lastDate) break;
    if (!rules.weekdays.includes(lagosDate.getUTCDay())) continue;

    const slots: string[] = [];
    for (
      let t = dayStart + rules.startHour * 3_600_000;
      t + slotMs <= dayStart + rules.endHour * 3_600_000;
      t += slotMs
    ) {
      if (t < earliest) continue;
      if (busyMs.some(([s, e]) => t < e && t + slotMs > s)) continue;
      slots.push(new Date(t).toISOString());
    }
    if (slots.length) days.set(lagosDate.toISOString().slice(0, 10), slots);
  }
  return days;
}
