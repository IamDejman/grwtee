/**
 * Email rules shared by the API routes and the December booking form. Plain code rather than a
 * zod schema, so the form can run the same check without shipping zod to the browser.
 */

// zod 4's email pattern, which these rules were first written with: the same addresses pass.
const EMAIL_PATTERN =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com"
]);

const INVALID = "Enter a valid email address";

/** Trims and lowercases the address. Rules run in order and the first one broken gives the message. */
export function parseEmail(value: unknown): { ok: true; email: string } | { ok: false; message: string } {
  if (typeof value !== "string") return { ok: false, message: INVALID };
  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { ok: false, message: INVALID };
  if (email.length > 254) return { ok: false, message: "Email is too long" };
  const [local, domain] = email.split("@");
  if (!local || !domain || local.length > 64 || domain.includes("..")) return { ok: false, message: INVALID };
  if (DISPOSABLE_DOMAINS.has(domain)) return { ok: false, message: "Please use a permanent email address" };
  return { ok: true, email };
}
