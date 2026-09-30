import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseEmail } from "@/lib/security/email-validation";
import { bookingInputSchema } from "./booking";

/**
 * Drafts let the admin page show people who started a brief but never booked, so the stylist can
 * follow up on WhatsApp. Saved once the contact step is done, then on every step change.
 */

const STEPS = ["occasions", "looks", "timeline", "style", "brief", "time"] as const;

const draftSchema = z.object({
  clientRef: z.string().uuid(),
  step: z.enum(STEPS),
  brief: bookingInputSchema
    .pick({
      name: true,
      email: true,
      country: true,
      whatsapp: true,
      occasions: true,
      otherOccasion: true,
      looks: true,
      events: true,
      plans: true,
      styleWords: true,
      styleNotes: true,
      styleLinks: true,
      comments: true
    })
    .extend({ looks: z.union([z.literal(5), z.literal(10), z.null()]) })
});

export const DRAFT_RETENTION_DAYS = 90;

/** Returns false for input that isn't a valid draft; never throws for bad input. */
export async function saveDraft(raw: unknown): Promise<boolean> {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) return false;
  const { clientRef, step, brief } = parsed.data;
  const email = parseEmail(brief.email);
  const phone = parsePhoneNumberFromString(brief.whatsapp, brief.country as CountryCode);
  if (!email.ok || !phone?.isValid()) return false;

  const fields = {
    name: brief.name,
    email: email.email,
    whatsapp: phone.number,
    country: brief.country,
    step,
    brief: { ...brief, email: email.email, whatsapp: phone.number } as Prisma.InputJsonObject
  };
  // Once booked, a late save from a slow tab must not reopen the draft.
  await prisma.$transaction(async (tx) => {
    const existing = await tx.decemberDraft.findUnique({ where: { clientRef }, select: { bookedAt: true } });
    if (existing?.bookedAt) return;
    await tx.decemberDraft.upsert({ where: { clientRef }, create: { clientRef, ...fields }, update: fields });
  });
  return true;
}

export async function pruneDrafts(now = new Date()): Promise<number> {
  const { count } = await prisma.decemberDraft.deleteMany({
    where: { updatedAt: { lt: new Date(now.getTime() - DRAFT_RETENTION_DAYS * 86_400_000) } }
  });
  return count;
}
