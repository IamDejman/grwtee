/** Escape PostgreSQL ILIKE wildcards in user input. */
export function sanitizeSearchTerm(input: string, maxLength = 80): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}
