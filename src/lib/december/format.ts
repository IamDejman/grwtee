import type { DecemberBooking } from "@prisma/client";

export type BriefFields = Pick<
  DecemberBooking,
  | "name"
  | "whatsapp"
  | "occasions"
  | "otherOccasion"
  | "looks"
  | "events"
  | "plans"
  | "styleWords"
  | "styleNotes"
  | "styleLinks"
  | "comments"
>;

/** The client's brief as labelled rows, skipping anything they left empty. */
export function briefRows(b: BriefFields): [string, string][] {
  const events = (b.events as { day: number; title: string }[]).map((e) => `${e.day} Dec: ${e.title}`).join("\n");
  const occasions = b.occasions.map((o) => (o === "Other" && b.otherOccasion ? b.otherOccasion : o)).join(", ");
  const rows: [string, string | null][] = [
    ["Looks", String(b.looks)],
    ["Occasions", occasions || null],
    ["December dates", events || null],
    ["Plans", b.plans],
    ["Style", b.styleWords.join(", ") || null],
    ["Style notes", b.styleNotes],
    ["References", b.styleLinks.join("\n") || null],
    ["Comments", b.comments]
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

export function formatSlot(date: Date, timeZone: string): { day: string; time: string } {
  return {
    day: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone }).format(date),
    time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(date)
  };
}

/** "Monday 5 October, 13:00 your time (12:00 in Lagos)", or just Lagos time when they match. */
export function describeSlot(date: Date, timeZone: string): string {
  const local = formatSlot(date, timeZone);
  const lagos = formatSlot(date, "Africa/Lagos");
  return local.time === lagos.time && local.day === lagos.day
    ? `${lagos.day}, ${lagos.time} Lagos time`
    : `${local.day}, ${local.time} your time (${lagos.time} in Lagos)`;
}

export function whatsappLink(e164: string, message?: string): string {
  const base = `https://wa.me/${e164.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function eventDescription(b: BriefFields, manageUrl: string): string {
  return [
    `GRWTEE x Lagos in December consultation with ${b.name}.`,
    "",
    ...briefRows(b).map(([label, value]) => (value.includes("\n") ? `${label}:\n  ${value.replace(/\n/g, "\n  ")}` : `${label}: ${value}`)),
    `WhatsApp: ${b.whatsapp}`,
    "",
    `Reschedule or cancel: ${manageUrl}`
  ].join("\n");
}
