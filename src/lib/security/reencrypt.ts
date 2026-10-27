import { prisma } from "@/lib/prisma";
import { needsReencryption, tryDecryptField, encryptField } from "@/lib/security/field-encryption";
import {
  paymentAccountNeedsReencryption,
  reencryptPaymentAccountFields
} from "@/lib/security/payment-account-crypto";

export type ReencryptSummary = {
  /** Payment accounts and authenticator secrets now under the current key. */
  updated: { paymentAccounts: number; mfaSecrets: number };
  /** Values no configured key can open. They're left as they are. */
  unreadable: { paymentAccounts: number; mfaSecrets: number };
  totalPaymentAccounts: number;
};

/**
 * Encrypts every sensitive value that isn't under the current key yet (plain
 * text, `v1:`, or an older key) with the current key, in one transaction:
 * either everything readable moves to the current key or nothing changes.
 * Call only when DATA_ENCRYPTION_KEY is set.
 */
export async function reencryptStoredSecrets(): Promise<ReencryptSummary> {
  return prisma.$transaction(async (tx) => {
    const summary: ReencryptSummary = {
      updated: { paymentAccounts: 0, mfaSecrets: 0 },
      unreadable: { paymentAccounts: 0, mfaSecrets: 0 },
      totalPaymentAccounts: 0
    };

    const accounts = await tx.paymentAccount.findMany();
    summary.totalPaymentAccounts = accounts.length;
    for (const account of accounts) {
      if (!paymentAccountNeedsReencryption(account)) continue;
      const fields = reencryptPaymentAccountFields(account);
      if (!fields) {
        summary.unreadable.paymentAccounts++;
        continue;
      }
      await tx.paymentAccount.update({ where: { id: account.id }, data: fields });
      summary.updated.paymentAccounts++;
    }

    const admins = await tx.admin.findMany({
      where: { mfaSecret: { not: null } },
      select: { id: true, mfaSecret: true }
    });
    for (const admin of admins) {
      if (!needsReencryption(admin.mfaSecret)) continue;
      const secret = tryDecryptField(admin.mfaSecret);
      if (!secret.ok || !secret.value) {
        summary.unreadable.mfaSecrets++;
        continue;
      }
      await tx.admin.update({ where: { id: admin.id }, data: { mfaSecret: encryptField(secret.value) } });
      summary.updated.mfaSecrets++;
    }

    return summary;
  }, { timeout: 30_000 });
}

/** How many stored values aren't under the current key, for the settings page. */
export async function reencryptionStatus(): Promise<{ toUpdate: number; unreadable: number }> {
  const [accounts, admins] = await Promise.all([
    prisma.paymentAccount.findMany(),
    prisma.admin.findMany({ where: { mfaSecret: { not: null } }, select: { mfaSecret: true } })
  ]);
  let toUpdate = 0;
  let unreadable = 0;
  for (const account of accounts) {
    if (!paymentAccountNeedsReencryption(account)) continue;
    if (reencryptPaymentAccountFields(account)) toUpdate++;
    else unreadable++;
  }
  for (const { mfaSecret } of admins) {
    if (!needsReencryption(mfaSecret)) continue;
    if (tryDecryptField(mfaSecret).ok) toUpdate++;
    else unreadable++;
  }
  return { toUpdate, unreadable };
}
