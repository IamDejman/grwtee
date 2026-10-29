import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/security/password-hash";
import { consumeRateLimit, isRateLimited, resetRateLimit } from "@/lib/security/rate-limit";

// Wrong passwords allowed when re-confirming a sensitive action, per admin,
// before it's refused for a while. Kept in the database (see rate-limit.ts).
const STEP_UP_MAX_FAILURES = 5;
const STEP_UP_WINDOW_MS = 15 * 60 * 1000;

export async function verifyAdminStepUp(
  adminEmail: string,
  currentPassword: string
): Promise<boolean> {
  const admin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!admin) return false;
  return verifyPassword(currentPassword, admin.password);
}

export async function requireStepUp(
  adminEmail: string,
  currentPassword: string | undefined
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!currentPassword) {
    return { ok: false, message: "Current password required for this action" };
  }
  const key = `admin-stepup:${adminEmail.trim().toLowerCase()}`;
  if (await isRateLimited(key, STEP_UP_MAX_FAILURES, STEP_UP_WINDOW_MS)) {
    return { ok: false, message: "Too many wrong passwords. Try again in 15 minutes." };
  }
  const valid = await verifyAdminStepUp(adminEmail, currentPassword);
  if (!valid) {
    await consumeRateLimit(key, STEP_UP_MAX_FAILURES, STEP_UP_WINDOW_MS);
    return { ok: false, message: "Invalid current password" };
  }
  await resetRateLimit(key);
  return { ok: true };
}
