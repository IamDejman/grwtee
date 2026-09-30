function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Minimal single-event .ics for "Add to calendar". */
export function consultationIcs(startIso: string, minutes = 30): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + minutes * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GRWTEE//December Consultation//EN",
    "BEGIN:VEVENT",
    `UID:${stamp(start)}-december@grwtee.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    "SUMMARY:GRWTEE December consultation",
    "DESCRIPTION:Your Google Meet link is in the invite from book@grwtee.com.",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}
