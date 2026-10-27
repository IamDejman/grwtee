/**
 * Re-encrypts stored payment details and authenticator secrets with the
 * current DATA_ENCRYPTION_KEY (plain text, `v1:` values and values under an
 * older key), the same as Settings → Re-encrypt. Keep the old key in
 * DATA_ENCRYPTION_PREVIOUS_KEYS while this runs. Needs DATABASE_URL too.
 *
 * Usage: npx tsx scripts/reencrypt-payment-accounts.ts
 */
import { prisma } from "../src/lib/prisma";
import { currentKeyId, isEncryptionEnabled } from "../src/lib/security/field-encryption";
import { reencryptStoredSecrets } from "../src/lib/security/reencrypt";

async function main() {
  if (!isEncryptionEnabled()) {
    console.error("DATA_ENCRYPTION_KEY is not set. Aborting.");
    process.exit(1);
  }

  const summary = await reencryptStoredSecrets();
  console.log(`Key ${currentKeyId()}:`, JSON.stringify(summary, null, 2));
  if (summary.unreadable.paymentAccounts || summary.unreadable.mfaSecrets) {
    console.error("Some values couldn't be decrypted: add their key to DATA_ENCRYPTION_PREVIOUS_KEYS and run again.");
    process.exitCode = 2;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
