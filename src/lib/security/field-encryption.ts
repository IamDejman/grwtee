import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

/**
 * AES-256-GCM for sensitive fields: bank and payment details, and the admin's
 * authenticator secret.
 *
 * Values are stored as `v2:<key id>:<iv>:<data>:<tag>`. The key id says which
 * key encrypted a value, so the key can be changed: move the old key to
 * DATA_ENCRYPTION_PREVIOUS_KEYS (comma-separated), set the new one as
 * DATA_ENCRYPTION_KEY, then run "Re-encrypt" in Settings. Older `v1:` values
 * have no key id and are tried with each key.
 */

const ALGO = "aes-256-gcm";

type Key = { id: string; key: Buffer };

function toKey(raw: string): Key {
  const key = createHash("sha256").update(raw).digest();
  // Derived from the key, so it can't fall out of step with it, and it
  // doesn't reveal it.
  const id = createHash("sha256").update("grwtee-key-id:").update(key).digest("hex").slice(0, 8);
  return { id, key };
}

function currentKey(): Key | null {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  return raw ? toKey(raw) : null;
}

function allKeys(): Key[] {
  const current = currentKey();
  const previous = (process.env.DATA_ENCRYPTION_PREVIOUS_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .map(toKey);
  return current ? [current, ...previous] : previous;
}

export function isEncryptionEnabled(): boolean {
  return currentKey() !== null;
}

/** The current key's id, to show which key is in use. */
export function currentKeyId(): string | null {
  return currentKey()?.id ?? null;
}

export class EncryptionKeyMissingError extends Error {
  constructor() {
    super("DATA_ENCRYPTION_KEY is not set, so sensitive details can't be saved.");
    this.name = "EncryptionKeyMissingError";
  }
}

/** The live site never stores these in plain text; local development may. */
function encryptionRequired(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  return vercelEnv ? vercelEnv === "production" : process.env.NODE_ENV === "production";
}

/** Throws EncryptionKeyMissingError on the live site when there's no key. */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return plaintext ?? null;
  const key = currentKey();
  if (!key) {
    if (encryptionRequired()) throw new EncryptionKeyMissingError();
    return plaintext;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key.key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v2", key.id, iv.toString("base64"), encrypted.toString("base64"), tag.toString("base64")].join(":");
}

type Parsed = { keys: Key[]; iv: string; data: string; tag: string } | null;

function parse(value: string): Parsed {
  const parts = value.split(":");
  if (parts[0] === "v2" && parts.length === 5) {
    return { keys: allKeys().filter((k) => k.id === parts[1]), iv: parts[2], data: parts[3], tag: parts[4] };
  }
  if (parts[0] === "v1" && parts.length === 4) {
    return { keys: allKeys(), iv: parts[1], data: parts[2], tag: parts[3] };
  }
  return null;
}

/**
 * Decrypts a stored value. Plain text, saved before encryption was set up,
 * comes back as it is. `ok: false` when no configured key opens it.
 */
export function tryDecryptField(value: string | null | undefined): { ok: true; value: string | null } | { ok: false } {
  if (value == null || value === "") return { ok: true, value: value ?? null };
  const parsed = parse(value);
  if (!parsed) return { ok: true, value };

  for (const { key } of parsed.keys) {
    try {
      const decipher = createDecipheriv(ALGO, key, Buffer.from(parsed.iv, "base64"));
      decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
      const plain = Buffer.concat([decipher.update(Buffer.from(parsed.data, "base64")), decipher.final()]);
      return { ok: true, value: plain.toString("utf8") };
    } catch {
      // Wrong key or damaged value: try the next key.
    }
  }
  return { ok: false };
}

/** Like tryDecryptField, but null (and a logged error) when the value can't be opened. */
export function decryptField(value: string | null | undefined): string | null {
  const result = tryDecryptField(value);
  if (result.ok) return result.value;
  console.error(
    "[Encryption] A stored value couldn't be decrypted. Its key isn't DATA_ENCRYPTION_KEY or in DATA_ENCRYPTION_PREVIOUS_KEYS."
  );
  return null;
}

/** True for a value that isn't encrypted with the current key: plain text, `v1:`, or an older key. */
export function needsReencryption(value: string | null | undefined): boolean {
  if (value == null || value === "") return false;
  const key = currentKey();
  if (!key) return false;
  const parts = value.split(":");
  return !(parts[0] === "v2" && parts.length === 5 && parts[1] === key.id);
}
