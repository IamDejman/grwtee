-- CreateTable
CREATE TABLE "DecemberBooking" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "clientRef" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "occasions" TEXT[],
    "otherOccasion" TEXT,
    "looks" INTEGER NOT NULL,
    "events" JSONB NOT NULL,
    "plans" TEXT,
    "styleWords" TEXT[],
    "styleNotes" TEXT,
    "styleLinks" TEXT[],
    "comments" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "slotEnd" TIMESTAMP(3) NOT NULL,
    "heldSlot" TIMESTAMP(3),
    "googleEventId" TEXT,
    "meetUrl" TEXT,
    "manageTokenHash" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "reminder24hAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecemberBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecemberDraft" (
    "id" TEXT NOT NULL,
    "clientRef" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "brief" JSONB NOT NULL,
    "bookedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecemberDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DecemberBooking_clientRef_key" ON "DecemberBooking"("clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "DecemberBooking_heldSlot_key" ON "DecemberBooking"("heldSlot");

-- CreateIndex
CREATE UNIQUE INDEX "DecemberBooking_manageTokenHash_key" ON "DecemberBooking"("manageTokenHash");

-- CreateIndex
CREATE INDEX "DecemberBooking_status_idx" ON "DecemberBooking"("status");

-- CreateIndex
CREATE INDEX "DecemberBooking_slotStart_idx" ON "DecemberBooking"("slotStart");

-- CreateIndex
CREATE UNIQUE INDEX "DecemberDraft_clientRef_key" ON "DecemberDraft"("clientRef");

-- CreateIndex
CREATE INDEX "DecemberDraft_bookedAt_updatedAt_idx" ON "DecemberDraft"("bookedAt", "updatedAt");

-- Client PII: no access through Supabase's public API. Prisma connects as the owner and bypasses RLS.
ALTER TABLE "DecemberBooking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DecemberDraft" ENABLE ROW LEVEL SECURITY;
