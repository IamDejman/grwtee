-- AlterTable: add type, email; make bank fields nullable
ALTER TABLE "PaymentAccount" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'bank';
ALTER TABLE "PaymentAccount" ADD COLUMN "email" TEXT;
ALTER TABLE "PaymentAccount" ALTER COLUMN "bankName" DROP NOT NULL;
ALTER TABLE "PaymentAccount" ALTER COLUMN "accountName" DROP NOT NULL;
ALTER TABLE "PaymentAccount" ALTER COLUMN "accountNumber" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "PaymentAccount_type_idx" ON "PaymentAccount"("type");
