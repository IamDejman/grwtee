-- AlterTable
ALTER TABLE "DecemberBooking" ADD COLUMN "holdExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DecemberBooking_holdExpiresAt_idx" ON "DecemberBooking"("holdExpiresAt");
