import { z } from "zod";

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com"
]);

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254, "Email is too long")
  .refine((email) => {
    const [local, domain] = email.split("@");
    if (!local || !domain) return false;
    if (local.length > 64) return false;
    if (domain.includes("..")) return false;
    return true;
  }, "Enter a valid email address")
  .refine((email) => {
    const domain = email.split("@")[1];
    return domain ? !DISPOSABLE_DOMAINS.has(domain) : false;
  }, "Please use a permanent email address");

export function parseEmail(value: unknown): { ok: true; email: string } | { ok: false; message: string } {
  const result = emailSchema.safeParse(value);
  if (result.success) return { ok: true, email: result.data };
  return { ok: false, message: result.error.errors[0]?.message ?? "Invalid email" };
}

export const emailField = emailSchema;
