import { DEFAULT_RULES, generateSlots } from "../availability";

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

  it("removes slots that overlap busy time", () => {
    const days = generateSlots(new Date("2026-10-05T05:00:00Z"), DEFAULT_RULES, [
      { start: "2026-10-05T10:15:00Z", end: "2026-10-05T11:00:00Z" }
    ]);
    expect(days.get("2026-10-05")).not.toContain("2026-10-05T10:00:00.000Z");
    expect(days.get("2026-10-05")).not.toContain("2026-10-05T10:30:00.000Z");
    expect(days.get("2026-10-05")).toContain("2026-10-05T11:00:00.000Z");
  });
});
