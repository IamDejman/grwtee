import bcrypt from "bcrypt";
import argon2 from "argon2";

const BCRYPT_ROUNDS = 10;

function isArgon2Hash(hash: string): boolean {
  return hash.startsWith("$argon2");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (isArgon2Hash(storedHash)) {
    return argon2.verify(storedHash, password);
  }
  return bcrypt.compare(password, storedHash);
}

/** Rehash legacy bcrypt passwords to Argon2 after successful login. */
export async function needsRehash(storedHash: string): Promise<boolean> {
  return !isArgon2Hash(storedHash);
}

export async function hashPasswordLegacyBcrypt(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
