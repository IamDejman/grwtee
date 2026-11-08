/**
 * @jest-environment node
 */
import { createCipheriv, createHash, randomBytes } from "crypto";
import type { PaymentAccount } from "@prisma/client";
import {
  EncryptionKeyMissingError,
  currentKeyId,
  decryptField,
  encryptField,
  needsReencryption,
  tryDecryptField
} from "@/lib/security/field-encryption";
import { paymentAccountNeedsReencryption, reencryptPaymentAccountFields } from "@/lib/security/payment-account-crypto";
import { reencryptStoredSecrets } from "@/lib/security/reencrypt";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => {
  const tx = {
    paymentAccount: { findMany: jest.fn(), update: jest.fn() },
    admin: { findMany: jest.fn(), update: jest.fn() }
  };
  return { prisma: { ...tx, $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } };
});

const ENV = { ...process.env };
const env = process.env as Record<string, string | undefined>;

// process.env turns undefined into the string "undefined", so delete instead.
function setEnv(name: string, value: string | undefined) {
  if (value === undefined) delete env[name];
  else env[name] = value;
}

function useKeys(current: string | undefined, previous?: string) {
  setEnv("DATA_ENCRYPTION_KEY", current);
  setEnv("DATA_ENCRYPTION_PREVIOUS_KEYS", previous);
}

/** A value in the format used before key ids: v1:<iv>:<data>:<tag>. */
function legacyV1(plain: string, rawKey: string): string {
  const key = createHash("sha256").update(rawKey).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), data.toString("base64"), cipher.getAuthTag().toString("base64")].join(":");
}

function account(fields: Partial<PaymentAccount>): PaymentAccount {
  return {
    id: "acc-1",
    label: "GTBank",
    type: "bank",
    currency: "NGN",
    bankName: "GTBank",
    accountName: "GRWTEE",
    accountNumber: null,
    iban: null,
    email: null,
    swiftCode: null,
    sortCode: null,
    notes: null,
    active: true,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...fields
  } as PaymentAccount;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  useKeys("current-key");
  env.NODE_ENV = "test";
  delete env.VERCEL_ENV;
});

afterAll(() => {
  process.env = ENV;
});

describe("field encryption", () => {
  it("stores the key id with each value and reads it back", () => {
    const stored = encryptField("0123456789")!;
    expect(stored).toMatch(new RegExp(`^v2:${currentKeyId()}:[^:]+:[^:]+:[^:]+$`));
    expect(stored).not.toContain("0123456789");
    expect(decryptField(stored)).toBe("0123456789");
    expect(needsReencryption(stored)).toBe(false);
  });

  it("still reads values saved before key ids", () => {
    const old = legacyV1("0123456789", "current-key");
    expect(decryptField(old)).toBe("0123456789");
    expect(needsReencryption(old)).toBe(true);
  });

  it("reads values under an old key kept in DATA_ENCRYPTION_PREVIOUS_KEYS, and flags them for re-encryption", () => {
    useKeys("old-key");
    const underOld = encryptField("0123456789")!;
    const legacy = legacyV1("GB29NWBK60161331926819", "old-key");

    useKeys("new-key", "old-key");
    expect(decryptField(underOld)).toBe("0123456789");
    expect(decryptField(legacy)).toBe("GB29NWBK60161331926819");
    expect(needsReencryption(underOld)).toBe(true);
    expect(needsReencryption(encryptField("x"))).toBe(false);
  });

  it("returns null instead of throwing when no key opens a value", () => {
    useKeys("old-key");
    const underOld = encryptField("0123456789")!;
    useKeys("new-key");

    expect(tryDecryptField(underOld)).toEqual({ ok: false });
    expect(decryptField(underOld)).toBeNull();
    expect(console.error).toHaveBeenCalled();
    // A damaged value too.
    expect(decryptField(`${encryptField("x")!.slice(0, -4)}AAAA`)).toBeNull();
  });

  it("passes plain text saved before encryption was set up straight through", () => {
    expect(decryptField("0123456789")).toBe("0123456789");
    expect(needsReencryption("0123456789")).toBe(true);
  });

  it("refuses to store plain text on the live site without a key", () => {
    useKeys(undefined);
    env.VERCEL_ENV = "production";
    expect(() => encryptField("0123456789")).toThrow(EncryptionKeyMissingError);

    env.VERCEL_ENV = "preview";
    expect(encryptField("0123456789")).toBe("0123456789");

    delete env.VERCEL_ENV;
    env.NODE_ENV = "production";
    expect(() => encryptField("0123456789")).toThrow(EncryptionKeyMissingError);
  });
});

describe("re-encrypting payment details", () => {
  it("moves every readable field to the current key", () => {
    useKeys("old-key");
    const stored = account({ accountNumber: encryptField("0123456789"), sortCode: "40-47-84" });
    useKeys("new-key", "old-key");

    expect(paymentAccountNeedsReencryption(stored)).toBe(true);
    const fields = reencryptPaymentAccountFields(stored)!;
    expect(decryptField(fields.accountNumber)).toBe("0123456789");
    expect(decryptField(fields.sortCode)).toBe("40-47-84");
    expect(paymentAccountNeedsReencryption(account(fields))).toBe(false);
  });

  it("leaves an account alone when one of its fields can't be decrypted, rather than wiping it", () => {
    useKeys("lost-key");
    const stored = account({ accountNumber: encryptField("0123456789"), sortCode: "40-47-84" });
    useKeys("new-key");
    expect(reencryptPaymentAccountFields(stored)).toBeNull();
  });

  it("re-encrypts accounts and authenticator secrets in one transaction and reports what it couldn't open", async () => {
    useKeys("old-key");
    const readable = account({ id: "acc-ok", accountNumber: encryptField("0123456789") });
    const secret = encryptField("JBSWY3DPEHPK3PXP");
    useKeys("lost-key");
    const unreadable = account({ id: "acc-lost", accountNumber: encryptField("999") });
    useKeys("new-key", "old-key");
    const current = account({ id: "acc-current", accountNumber: encryptField("555") });

    const tx = prisma as unknown as {
      paymentAccount: Record<string, jest.Mock>;
      admin: Record<string, jest.Mock>;
      $transaction: jest.Mock;
    };
    tx.paymentAccount.findMany.mockResolvedValue([readable, unreadable, current]);
    tx.admin.findMany.mockResolvedValue([{ id: "admin-1", mfaSecret: secret }]);

    const summary = await reencryptStoredSecrets();

    expect(tx.$transaction).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({
      updated: { paymentAccounts: 1, mfaSecrets: 1 },
      unreadable: { paymentAccounts: 1, mfaSecrets: 0 },
      totalPaymentAccounts: 3
    });
    expect(tx.paymentAccount.update).toHaveBeenCalledTimes(1);
    const saved = tx.paymentAccount.update.mock.calls[0][0];
    expect(saved.where).toEqual({ id: "acc-ok" });
    expect(decryptField(saved.data.accountNumber)).toBe("0123456789");
    const mfa = tx.admin.update.mock.calls[0][0];
    expect(needsReencryption(mfa.data.mfaSecret)).toBe(false);
    expect(decryptField(mfa.data.mfaSecret)).toBe("JBSWY3DPEHPK3PXP");
  });
});
