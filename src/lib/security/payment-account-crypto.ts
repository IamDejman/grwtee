import type { PaymentAccount } from "@prisma/client";
import { decryptField, encryptField, needsReencryption, tryDecryptField } from "@/lib/security/field-encryption";

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

/** True when any sensitive field is in plain text or under an older key. */
export function paymentAccountNeedsReencryption(account: PaymentAccount): boolean {
  return SENSITIVE_KEYS.some((key) => needsReencryption(account[key]));
}

/**
 * The sensitive fields encrypted again with the current key, or null when one
 * of them can't be decrypted (its key is missing). Those are left alone
 * rather than overwritten.
 */
export function reencryptPaymentAccountFields(
  account: PaymentAccount
): Pick<PaymentAccount, SensitiveKey> | null {
  const fields = {} as Pick<PaymentAccount, SensitiveKey>;
  for (const key of SENSITIVE_KEYS) {
    const decrypted = tryDecryptField(account[key]);
    if (!decrypted.ok) return null;
    fields[key] = encryptField(decrypted.value);
  }
  return fields;
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
