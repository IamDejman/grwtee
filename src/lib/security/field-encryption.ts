import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const PREFIX = "v1";
const ALGO = "aes-256-gcm";

function getKey(): Buffer | null {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) return null;
  return createHash("sha256").update(raw).digest();
}

export function isEncryptionEnabled(): boolean {
  return Boolean(getKey());
}

export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return plaintext ?? null;
  const key = getKey();
  if (!key) return plaintext;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), encrypted.toString("base64"), tag.toString("base64")].join(":");
}

export function decryptField(value: string | null | undefined): string | null {
  if (value == null || value === "") return value ?? null;
  if (!value.startsWith(`${PREFIX}:`)) return value;

  const key = getKey();
  if (!key) return null;

  const parts = value.split(":");
  if (parts.length !== 4) return null;

  const iv = Buffer.from(parts[1], "base64");
  const data = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
