import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/security/password-hash";

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
  const valid = await verifyAdminStepUp(adminEmail, currentPassword);
  if (!valid) {
    return { ok: false, message: "Invalid current password" };
  }
  return { ok: true };
}
