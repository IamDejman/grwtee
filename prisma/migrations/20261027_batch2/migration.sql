-- Audit batch 2 (website).

-- WEB-09: the time step of the last authenticator code accepted, so a code
-- can't be used twice.
ALTER TABLE "Admin" ADD COLUMN "mfaLastTimeStep" INTEGER;

-- WEB-02: one row per broadcast recipient; broadcasts send in batches.
-- Existing broadcasts have already been sent.
ALTER TABLE "Broadcast" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'sent',
    ADD COLUMN "recipientCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "lastError" TEXT,
    ADD COLUMN "siteUrl" TEXT;

CREATE TABLE "BroadcastRecipient" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "unsubscribeToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "batchKey" TEXT,
    "claimedAt" TIMESTAMP(3),
    "providerId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BroadcastRecipient_broadcastId_email_key" ON "BroadcastRecipient"("broadcastId", "email");
CREATE INDEX "BroadcastRecipient_broadcastId_status_idx" ON "BroadcastRecipient"("broadcastId", "status");
CREATE INDEX "Broadcast_status_idx" ON "Broadcast"("status");

ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_broadcastId_fkey"
    FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WEB-07/08/09: rate limits kept in the database, so they hold across
-- server instances and restarts.
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

-- Like every website table (see 20261026_enable_rls): no access through
-- Supabase's public API. Prisma connects as the owner and is unaffected.
ALTER TABLE "BroadcastRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;
