-- Batch 3 of the October 2026 audit. Safe on a database that has every
-- earlier migration; production deploys run it (scripts/vercel-build.sh).

-- OPS-04: two things the schema said that no migration did, found by the
-- new CI check that compares them.
DELETE FROM "PasswordResetOtp" WHERE "resetToken" IS NULL;
ALTER TABLE "PasswordResetOtp" ALTER COLUMN "resetToken" SET NOT NULL;

-- WEB-23: the audit log's admin, kept when the admin is deleted (RESTRICT,
-- not CASCADE). NOT VALID: rows written before can't block it; new rows
-- are checked.
ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId")
  REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

-- ARCH-02: the stylist's app profile, by id.
ALTER TABLE "Admin" ADD COLUMN "supabaseProfileId" UUID;
CREATE UNIQUE INDEX "Admin_supabaseProfileId_key" ON "Admin"("supabaseProfileId");

-- WEB-23: prices as exact amounts.
ALTER TABLE "Service"
  ALTER COLUMN "priceUSD" TYPE DECIMAL(12,2) USING round("priceUSD"::numeric, 2),
  ALTER COLUMN "priceNGN" TYPE DECIMAL(12,2) USING round("priceNGN"::numeric, 2);

-- WEB-23: invoice items and chosen accounts as JSON columns. Text that
-- isn't JSON (none is expected) is kept as a JSON string, not lost.
CREATE FUNCTION pg_temp.as_jsonb(t TEXT) RETURNS JSONB
LANGUAGE plpgsql AS $$
BEGIN
  RETURN t::jsonb;
EXCEPTION WHEN others THEN
  RETURN to_jsonb(t);
END;
$$;

ALTER TABLE "Invoice"
  ALTER COLUMN "items" TYPE JSONB USING pg_temp.as_jsonb("items"),
  ALTER COLUMN "paymentAccountIds" TYPE JSONB USING pg_temp.as_jsonb(NULLIF("paymentAccountIds", ''));

-- WEB-20: invoice numbers from a sequence, starting after the highest one
-- used, so deleting the newest invoice doesn't reuse its number and two
-- invoices made at once don't collide.
CREATE SEQUENCE "invoice_number_seq" START WITH 1;
SELECT setval(
  '"invoice_number_seq"',
  COALESCE((SELECT max(substring("invoiceNumber" FROM '(\d+)$')::BIGINT) FROM "Invoice"), 0) + 1,
  false
);

-- WEB-23: the values the code uses. NOT VALID: existing rows aren't
-- rechecked, new and changed rows are.
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_status_check"
  CHECK ("status" IN ('pending', 'contacted', 'confirmed', 'completed')) NOT VALID;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_status_check"
  CHECK ("status" IN ('unpaid', 'paid')) NOT VALID;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_currency_check"
  CHECK ("currency" IN ('NGN', 'USD')) NOT VALID;
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_type_check"
  CHECK ("type" IN ('bank', 'paypal', 'wise', 'other')) NOT VALID;
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_currency_check"
  CHECK ("currency" IN ('NGN', 'USD', 'GBP', 'EUR')) NOT VALID;
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_status_check"
  CHECK ("status" IN ('pending', 'confirmed', 'unsubscribed')) NOT VALID;
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_status_check"
  CHECK ("status" IN ('sending', 'sent')) NOT VALID;
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_status_check"
  CHECK ("status" IN ('pending', 'sending', 'sent', 'failed', 'skipped')) NOT VALID;
ALTER TABLE "DecemberBooking" ADD CONSTRAINT "DecemberBooking_status_check"
  CHECK ("status" IN ('pending', 'scheduled', 'paid', 'cancelled', 'expired')) NOT VALID;
ALTER TABLE "Service" ADD CONSTRAINT "Service_prices_check"
  CHECK (("priceUSD" IS NULL OR "priceUSD" >= 0) AND ("priceNGN" IS NULL OR "priceNGN" >= 0)) NOT VALID;

-- The sequence isn't for Supabase's public API (20261026_enable_rls).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SEQUENCE "invoice_number_seq" FROM anon, authenticated;
  END IF;
END $$;
