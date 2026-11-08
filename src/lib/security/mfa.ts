import { generateSecret, generateURI, verifySync } from "otplib";
import { encryptField, decryptField } from "@/lib/security/field-encryption";
import { prisma } from "@/lib/prisma";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function getTotpUri(email: string, secret: string): string {
  return generateURI({
    issuer: "GRWTEE Admin",
    label: email,
    secret
  });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const result = verifySync({ secret, token: code });
  return result.valid;
}

/**
 * Checks a code and records its time step, so the same code (or an older
 * one) can't be used again: someone who saw it can't replay it while it's
 * still valid. The record is a conditional update, so two requests with the
 * same code can't both succeed.
 */
export async function verifyTotpCodeOnce(
  adminId: string,
  secret: string,
  code: string,
  lastTimeStep: number | null
): Promise<boolean> {
  const result = verifySync({
    secret,
    token: code,
    ...(lastTimeStep !== null ? { afterTimeStep: lastTimeStep } : {})
  });
  // TOTP results carry the matched time step (HOTP ones don't).
  if (!result.valid || !("timeStep" in result)) return false;
  const timeStep = result.timeStep;

  const claimed = await prisma.admin.updateMany({
    where: {
      id: adminId,
      OR: [{ mfaLastTimeStep: null }, { mfaLastTimeStep: { lt: timeStep } }]
    },
    data: { mfaLastTimeStep: timeStep }
  });
  return claimed.count === 1;
}

export function encryptTotpSecret(secret: string): string {
  return encryptField(secret) ?? secret;
}

export function decryptTotpSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  return decryptField(stored);
}
