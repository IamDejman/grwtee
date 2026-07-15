import { z } from "zod";

const COMMON_PASSWORDS = new Set([
  "password123",
  "password1234",
  "admin123456",
  "qwerty123456",
  "welcome12345",
  "changeme1234"
]);

export const passwordPolicySchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password is too long")
  .refine((value) => /[a-z]/.test(value), "Include a lowercase letter")
  .refine((value) => /[A-Z]/.test(value), "Include an uppercase letter")
  .refine((value) => /[0-9]/.test(value), "Include a number")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Include a special character")
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), "Password is too common");

export function validatePassword(password: string): { ok: true } | { ok: false; message: string } {
  const result = passwordPolicySchema.safeParse(password);
  if (result.success) return { ok: true };
  return { ok: false, message: result.error.errors[0]?.message ?? "Invalid password" };
}
