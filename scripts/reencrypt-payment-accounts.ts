/**
 * One-off CLI to re-encrypt plaintext payment account fields.
 * Requires DATA_ENCRYPTION_KEY and DATABASE_URL in the environment.
 *
 * Usage: npx tsx scripts/reencrypt-payment-accounts.ts
 */
import { prisma } from "../src/lib/prisma";
import { isEncryptionEnabled } from "../src/lib/security/field-encryption";
import {
  paymentAccountNeedsReencryption,
  reencryptPaymentAccountFields
} from "../src/lib/security/payment-account-crypto";

async function main() {
  if (!isEncryptionEnabled()) {
    console.error("DATA_ENCRYPTION_KEY is not set. Aborting.");
    process.exit(1);
  }

  const accounts = await prisma.paymentAccount.findMany();
  let updated = 0;

  for (const account of accounts) {
    if (!paymentAccountNeedsReencryption(account)) continue;
    const fields = reencryptPaymentAccountFields(account);
    await prisma.paymentAccount.update({
      where: { id: account.id },
      data: fields
    });
    updated += 1;
    console.log(`Re-encrypted account ${account.id} (${account.label})`);
  }

  console.log(`Done. Updated ${updated} of ${accounts.length} account(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
