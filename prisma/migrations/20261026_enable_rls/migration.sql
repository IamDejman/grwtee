-- Turn on row-level security for every website table.
-- These tables live in the Supabase project's public schema, which Supabase
-- serves through its REST API to anyone holding the public anon key. With
-- RLS on and no policies, that API returns nothing for them. Prisma
-- connects as the table owner, which RLS doesn't apply to, so the website
-- is unaffected (DecemberBooking and DecemberDraft already work this way).
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetOtp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscriber" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WaitlistEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Broadcast" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GalleryImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DecemberBooking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DecemberDraft" ENABLE ROW LEVEL SECURITY;
-- Prisma's own table exists wherever migrations are deployed, but not in
-- the empty database `prisma migrate diff` builds to compare the schema.
DO $$
BEGIN
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
