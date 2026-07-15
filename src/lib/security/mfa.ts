import { generateSecret, generateURI, verifySync } from "otplib";
import { encryptField, decryptField } from "@/lib/security/field-encryption";

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

export function encryptTotpSecret(secret: string): string {
  return encryptField(secret) ?? secret;
}

export function decryptTotpSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  return decryptField(stored);
}
