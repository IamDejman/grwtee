/**
 * One CSV cell. A value starting with = + - @ (or a tab or carriage
 * return) is read as a formula by Excel and Sheets, so a waitlist name like
 * `=HYPERLINK(...)` could run when the export is opened; those get a
 * leading apostrophe, which spreadsheets show as plain text (WEB-24).
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRows(header: string[], rows: unknown[][]): string {
  return [header.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
}
