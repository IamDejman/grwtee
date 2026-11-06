import { bookingClosed, DEFAULT_RULES, generateSlots, slotsEnd } from "../availability";

describe("generateSlots", () => {
  it("matches the Calendly rules: weekdays, 11:00 to 15:00 Lagos, 8 slots", () => {
    // Monday 5 Oct 2026, 06:00 Lagos
    const days = generateSlots(new Date("2026-10-05T05:00:00Z"));
    const monday = days.get("2026-10-05");
    expect(monday).toHaveLength(8);
    expect(monday?.[0]).toBe("2026-10-05T10:00:00.000Z"); // 11:00 Lagos
    expect(monday?.[7]).toBe("2026-10-05T13:30:00.000Z"); // 14:30 Lagos
    expect(days.has("2026-10-10")).toBe(false); // Saturday
    expect(days.has("2026-10-11")).toBe(false); // Sunday
  });

  it("applies 4 hours minimum notice", () => {
    // Wednesday 30 Sep 2026, 09:44 Lagos: first slot is 14:00, as on Calendly
    const days = generateSlots(new Date("2026-09-30T08:44:00Z"));
    expect(days.get("2026-09-30")).toEqual([
      "2026-09-30T13:00:00.000Z",
      "2026-09-30T13:30:00.000Z"
    ]);
  });

  it("stops at the rolling window", () => {
    const days = generateSlots(new Date("2026-09-30T08:44:00Z"));
    const last = [...days.keys()].at(-1);
    expect(last).toBe("2026-11-27"); // last weekday before 29 Nov, as on Calendly
  });

  it("never offers times after the last booking day", () => {
    const days = generateSlots(new Date("2026-10-20T08:00:00Z"));
    expect([...days.keys()].at(-1)).toBe("2026-11-27");
    expect([...days.keys()].some((d) => d.startsWith("2026-12"))).toBe(false);
  });

  it("offers December when there is no last day", () => {
    const days = generateSlots(new Date("2026-10-20T08:00:00Z"), { ...DEFAULT_RULES, lastDate: null });
    expect([...days.keys()].some((d) => d.startsWith("2026-12"))).toBe(true);
  });

  it("closes bookings after the last day in Lagos", () => {
    expect(bookingClosed(new Date("2026-11-27T22:59:00Z"))).toBe(false); // 23:59 Lagos, 27 Nov
    expect(bookingClosed(new Date("2026-11-27T23:00:00Z"))).toBe(true); // 00:00 Lagos, 28 Nov
    expect(generateSlots(new Date("2026-11-28T08:00:00Z")).size).toBe(0);
    expect(bookingClosed(new Date("2026-12-10T12:00:00Z"), { ...DEFAULT_RULES, lastDate: null })).toBe(false);
  });

  it("removes slots that overlap busy time", () => {
    const days = generateSlots(new Date("2026-10-05T05:00:00Z"), DEFAULT_RULES, [
      { start: "2026-10-05T10:15:00Z", end: "2026-10-05T11:00:00Z" }
    ]);
    expect(days.get("2026-10-05")).not.toContain("2026-10-05T10:00:00.000Z");
    expect(days.get("2026-10-05")).not.toContain("2026-10-05T10:30:00.000Z");
    expect(days.get("2026-10-05")).toContain("2026-10-05T11:00:00.000Z");
  });
});

describe("slotsEnd", () => {
  it("stops at the end of the last booking day in Lagos", () => {
    // Friday 6 Nov 2026, 20:00 Lagos: the rolling window runs into January, the last day is 27 Nov.
    expect(slotsEnd(new Date("2026-11-06T19:00:00Z")).toISOString()).toBe("2026-11-27T23:00:00.000Z");
  });

  it("uses the rolling window when it ends first, or when there is no last day", () => {
    const now = new Date("2026-09-01T08:00:00Z");
    expect(slotsEnd(now, { ...DEFAULT_RULES, windowDays: 14 }).toISOString()).toBe("2026-09-16T08:00:00.000Z");
    expect(slotsEnd(now, { ...DEFAULT_RULES, lastDate: null }).toISOString()).toBe("2026-11-01T08:00:00.000Z");
  });

  it("falls back to the rolling window when the last day isn't a date", () => {
    const now = new Date("2026-09-01T08:00:00Z");
    expect(slotsEnd(now, { ...DEFAULT_RULES, lastDate: "2026-13-01" }).toISOString()).toBe("2026-11-01T08:00:00.000Z");
  });

  it("never cuts off a slot the rules can offer", () => {
    const everyDayToMidnight = { ...DEFAULT_RULES, weekdays: [0, 1, 2, 3, 4, 5, 6], endHour: 24 };
    const shortWindow = { ...DEFAULT_RULES, lastDate: null, windowDays: 5 };
    for (const iso of ["2026-09-30T08:44:00Z", "2026-11-06T19:00:00Z", "2026-11-27T05:00:00Z"]) {
      for (const rules of [DEFAULT_RULES, everyDayToMidnight, shortWindow]) {
        const now = new Date(iso);
        const ends = [...generateSlots(now, rules).values()].flat().map((s) => Date.parse(s) + rules.slotMinutes * 60_000);
        expect(ends.length).toBeGreaterThan(0);
        expect(Math.max(...ends)).toBeLessThanOrEqual(slotsEnd(now, rules).getTime());
      }
    }
  });
});
