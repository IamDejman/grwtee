import type { PaymentAccount } from "@prisma/client";
import { decryptField, encryptField } from "@/lib/security/field-encryption";

const SENSITIVE_KEYS = [
  "accountNumber",
  "iban",
  "email",
  "swiftCode",
  "sortCode"
] as const;

type SensitiveKey = (typeof SENSITIVE_KEYS)[number];

export function encryptPaymentAccountInput<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data } as T;
  for (const key of SENSITIVE_KEYS) {
    if (key in out && typeof out[key] === "string") {
      (out as Record<string, unknown>)[key] = encryptField(out[key] as string);
    }
  }
  return out;
}

export function decryptPaymentAccount(account: PaymentAccount): PaymentAccount {
  const out = { ...account };
  for (const key of SENSITIVE_KEYS) {
    const val = out[key as SensitiveKey];
    if (typeof val === "string") {
      (out as Record<string, unknown>)[key] = decryptField(val);
    }
  }
  return out;
}

export function decryptPaymentAccounts(accounts: PaymentAccount[]): PaymentAccount[] {
  return accounts.map(decryptPaymentAccount);
}

function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("v1:");
}

/** True when any sensitive field is stored in plaintext. */
export function paymentAccountNeedsReencryption(account: PaymentAccount): boolean {
  for (const key of SENSITIVE_KEYS) {
    const val = account[key as SensitiveKey];
    if (typeof val === "string" && val.length > 0 && !isEncrypted(val)) {
      return true;
    }
  }
  return false;
}

/** Re-encrypt sensitive fields from decrypted values. */
export function reencryptPaymentAccountFields(
  account: PaymentAccount
): Pick<PaymentAccount, SensitiveKey> {
  const decrypted = decryptPaymentAccount(account);
  const encrypted = encryptPaymentAccountInput({
    accountNumber: decrypted.accountNumber,
    iban: decrypted.iban,
    email: decrypted.email,
    swiftCode: decrypted.swiftCode,
    sortCode: decrypted.sortCode
  });
  return {
    accountNumber: (encrypted.accountNumber as string | null) ?? null,
    iban: (encrypted.iban as string | null) ?? null,
    email: (encrypted.email as string | null) ?? null,
    swiftCode: (encrypted.swiftCode as string | null) ?? null,
    sortCode: (encrypted.sortCode as string | null) ?? null
  };
}

/** Mask sensitive fields for list/summary views. */
export function maskPaymentAccount(account: PaymentAccount): PaymentAccount {
  const decrypted = decryptPaymentAccount(account);
  return {
    ...decrypted,
    accountNumber: decrypted.accountNumber ? maskValue(decrypted.accountNumber) : null,
    iban: decrypted.iban ? maskValue(decrypted.iban) : null,
    email: decrypted.email ? maskEmail(decrypted.email) : null,
    swiftCode: decrypted.swiftCode ? maskValue(decrypted.swiftCode) : null,
    sortCode: decrypted.sortCode ? maskValue(decrypted.sortCode) : null
  };
}

function maskValue(value: string): string {
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "****";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
