/**
 * JSON for a <script type="application/ld+json"> block. JSON.stringify
 * leaves `<` as it is, so a value containing "</script>" would end the
 * block and run what follows (WEB-17); these characters are written as
 * escapes instead, which JSON parsers read back unchanged.
 */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** `value` when it's an http(s) address, otherwise `fallback`. */
export function httpUrlOr(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}
