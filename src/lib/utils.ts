export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Format a service slug for display in emails (e.g. "virtual-personal-styling" → "Virtual Personal Styling"). */
export function formatServiceLabel(service: string): string {
  return service
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === "book@grwtee.com";
}

/** Format booking message for display. If message is JSON with city/additionalNotes, return readable text. */
export function formatBookingMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed.startsWith("{")) return message;
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    const city = obj.city != null && String(obj.city).trim() !== "" ? String(obj.city).trim() : null;
    const notes = obj.additionalNotes != null && String(obj.additionalNotes).trim() !== "" ? String(obj.additionalNotes).trim() : null;
    const parts: string[] = [];
    if (city) parts.push(`City: ${city}`);
    parts.push(notes ? `Additional notes: ${notes}` : "Additional notes: —");
    return parts.join("\n");
  } catch {
    return message;
  }
}


