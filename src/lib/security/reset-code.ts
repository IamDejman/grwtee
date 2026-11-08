import { createHash, createHmac, timingSafeEqual } from "crypto";

/**
 * Admin password-reset codes are stored as an HMAC, so a copy of the
 * database doesn't hand out live codes. Keyed with NEXTAUTH_SECRET, which
 * the middleware already requires; falls back to a plain hash without it.
 */
export function hashResetCode(code: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  return secret
    ? createHmac("sha256", secret).update(code).digest("hex")
    : createHash("sha256").update(code).digest("hex");
}

/** Constant-time check of a submitted code against the stored hash. */
export function resetCodeMatches(code: string, storedHash: string): boolean {
  const submitted = Buffer.from(hashResetCode(code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return submitted.length === stored.length && timingSafeEqual(submitted, stored);
}
