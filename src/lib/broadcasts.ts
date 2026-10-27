import { randomUUID } from "crypto";
import type { Broadcast } from "@prisma/client";
import { broadcastWrapperHtml } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { sendEmailBatch, type BatchEmail } from "@/lib/resend";

/**
 * Newsletter broadcasts go out in batches of up to 100 (Resend's limit),
 * over as many requests as it takes. Every recipient has a row, so progress
 * survives a timeout and nobody gets the same broadcast twice.
 *
 * A batch is claimed before it's sent and keeps its key until it's finished.
 * If a send dies halfway, the batch is tried again with the same key once
 * the claim goes stale, and Resend returns the first result instead of
 * sending again (it remembers keys for 24 hours).
 */

const BATCH_SIZE = 100;
// No request holds a claim longer than this: the routes stop after 60 seconds.
const CLAIM_STALE_SECONDS = 120;
// Resend allows a few requests a second; leave room for other email.
const BATCH_GAP_MS = 600;

export type BroadcastProgress = {
  id: string;
  subject: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  /** Recipients not tried yet. */
  remaining: number;
  lastError: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

type RecipientRow = { id: string; email: string; unsubscribeToken: string; batchKey: string | null };
type Batch = { key: string; recipients: RecipientRow[] };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>(?=\n?)/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The broadcast with this exact subject and content created in the last day,
 * if any, so sending twice (a double click, or a retry after a timeout)
 * doesn't email everyone again.
 */
export async function findRecentDuplicate(subject: string, html: string): Promise<Broadcast | null> {
  return prisma.broadcast.findFirst({
    where: { subject, html, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } },
    orderBy: { createdAt: "desc" }
  });
}

/** Saves the broadcast and one recipient row per confirmed subscriber. */
export async function createBroadcast(params: { subject: string; html: string; siteUrl: string }): Promise<Broadcast> {
  const { subject, html, siteUrl } = params;
  return prisma.$transaction(async (tx) => {
    const broadcast = await tx.broadcast.create({
      data: { subject, html, text: htmlToText(html), status: "sending", siteUrl: siteUrl.replace(/\/$/, "") }
    });
    const recipientCount = await tx.$executeRaw`
      INSERT INTO "BroadcastRecipient" ("id", "broadcastId", "email", "unsubscribeToken")
      SELECT gen_random_uuid()::text, ${broadcast.id}, "email", "unsubscribeToken"
      FROM "Subscriber"
      WHERE "status" = 'confirmed'`;
    return tx.broadcast.update({
      where: { id: broadcast.id },
      data: recipientCount ? { recipientCount } : { recipientCount, status: "sent", sentAt: new Date() }
    });
  });
}

/** People who unsubscribed while a broadcast was going out don't get it. */
async function skipUnsubscribed(broadcastId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "BroadcastRecipient" AS r SET "status" = 'skipped'
    WHERE r."broadcastId" = ${broadcastId} AND r."status" = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM "Subscriber" AS s WHERE s."email" = r."email" AND s."status" = 'confirmed'
      )`;
}

/**
 * The next batch to send: first one that was claimed but never finished
 * (sent again with its own key), otherwise up to 100 new recipients. Each
 * claim is a single statement, so two senders never get the same rows.
 */
async function claimBatch(broadcastId: string): Promise<Batch | null> {
  // Prisma stores times in UTC without a time zone, so compare in UTC.
  const unfinished = await prisma.$queryRaw<RecipientRow[]>`
    UPDATE "BroadcastRecipient" SET "claimedAt" = timezone('utc', now())
    WHERE "broadcastId" = ${broadcastId}
      AND "status" = 'sending'
      AND "claimedAt" < timezone('utc', now()) - make_interval(secs => ${CLAIM_STALE_SECONDS}::float8)
      AND "batchKey" = (
        SELECT "batchKey" FROM "BroadcastRecipient"
        WHERE "broadcastId" = ${broadcastId}
          AND "status" = 'sending'
          AND "claimedAt" < timezone('utc', now()) - make_interval(secs => ${CLAIM_STALE_SECONDS}::float8)
        LIMIT 1
      )
    RETURNING "id", "email", "unsubscribeToken", "batchKey"`;
  if (unfinished.length && unfinished[0].batchKey) {
    return { key: unfinished[0].batchKey, recipients: byId(unfinished) };
  }

  const key = randomUUID();
  const claimed = await prisma.$queryRaw<RecipientRow[]>`
    UPDATE "BroadcastRecipient"
    SET "status" = 'sending', "batchKey" = ${key}, "claimedAt" = timezone('utc', now())
    WHERE "id" IN (
      SELECT "id" FROM "BroadcastRecipient"
      WHERE "broadcastId" = ${broadcastId} AND "status" = 'pending'
      ORDER BY "id"
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "email", "unsubscribeToken", "batchKey"`;
  return claimed.length ? { key, recipients: byId(claimed) } : null;
}

/** Same rows, same order, so a retried batch matches the first attempt exactly. */
function byId(rows: RecipientRow[]): RecipientRow[] {
  return [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function buildEmail(broadcast: Broadcast, recipient: RecipientRow): BatchEmail {
  const unsubscribeUrl = `${broadcast.siteUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(recipient.unsubscribeToken)}`;
  return {
    to: recipient.email,
    subject: broadcast.subject,
    html: broadcastWrapperHtml({ contentHtml: broadcast.html, unsubscribeUrl }),
    text: `${broadcast.text ?? ""}\n\n-\nUnsubscribe: ${unsubscribeUrl}`,
    // One-click unsubscribe (RFC 8058): mail apps show an Unsubscribe button
    // that POSTs to this address. Gmail and Yahoo expect it on newsletters.
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
    }
  };
}

/** Puts a batch back in the queue, for when Resend refused it without sending anything. */
async function releaseBatch(batch: Batch): Promise<void> {
  await prisma.broadcastRecipient.updateMany({
    where: { id: { in: batch.recipients.map((r) => r.id) }, status: "sending" },
    data: { status: "pending", batchKey: null, claimedAt: null }
  });
}

async function recordResults(batch: Batch, results: ({ id: string | null } | { error: string })[]): Promise<void> {
  const ids = batch.recipients.map((r) => r.id);
  const statuses = results.map((r) => ("error" in r ? "failed" : "sent"));
  const providerIds = results.map((r) => ("id" in r ? r.id : null));
  const errors = results.map((r) => ("error" in r ? r.error.slice(0, 500) : null));
  await prisma.$executeRaw`
    UPDATE "BroadcastRecipient" AS r
    SET "status" = v.status,
        "providerId" = v.provider_id,
        "error" = v.error,
        "sentAt" = CASE WHEN v.status = 'sent' THEN timezone('utc', now()) END
    FROM unnest(${ids}::text[], ${statuses}::text[], ${providerIds}::text[], ${errors}::text[])
      AS v(id, status, provider_id, error)
    WHERE r."id" = v.id AND r."status" = 'sending'`;
}

async function failBatch(batch: Batch, reason: string): Promise<void> {
  await prisma.broadcastRecipient.updateMany({
    where: { id: { in: batch.recipients.map((r) => r.id) }, status: "sending" },
    data: { status: "failed", error: reason.slice(0, 500) }
  });
}

/** What to tell the admin when sending stops early. */
function stopMessage(code: string, message: string, statusCode: number | null): string {
  if (code === "daily_quota_exceeded") return "Resend’s daily sending limit is reached. Continue tomorrow to send the rest.";
  if (code === "monthly_quota_exceeded") return "Resend’s monthly sending limit is reached. Upgrade the Resend plan or continue next month.";
  if (code === "rate_limit_exceeded") return "Resend asked us to slow down. Continue in a minute.";
  if (statusCode === null || statusCode >= 500) {
    return `Couldn’t reach Resend (${message}). Continue in a few minutes; nobody gets it twice.`;
  }
  return `Resend didn’t accept the emails: ${message}`;
}

/**
 * Sends one batch. Returns why sending should stop, or null to carry on.
 */
async function sendBatch(broadcast: Broadcast, batch: Batch): Promise<string | null> {
  const emails = batch.recipients.map((r) => buildEmail(broadcast, r));
  let result = await sendEmailBatch(emails, `broadcast-${batch.key}`);
  if (!result.ok && result.code === "rate_limit_exceeded") {
    await sleep(1500);
    result = await sendEmailBatch(emails, `broadcast-${batch.key}`);
  }

  if (result.ok) {
    await recordResults(batch, result.results);
    return null;
  }

  // Another request is sending this exact batch right now.
  if (result.code === "concurrent_idempotent_requests") return null;
  // Resend already has this key with different content (the email template
  // changed between attempts). It may have gone out, so don't send it again.
  if (result.code === "invalid_idempotent_request") {
    await failBatch(batch, "Not sent again: an earlier attempt at this batch may already have gone out.");
    return null;
  }
  // A 4xx means Resend refused the whole batch, so nothing went out: queue it
  // again. Otherwise it's unknown, so leave it claimed; it's retried with the
  // same key once the claim is stale and Resend won't send it twice.
  if (result.statusCode !== null && result.statusCode < 500) await releaseBatch(batch);
  return stopMessage(result.code, result.message, result.statusCode);
}

async function progress(broadcastId: string, lastError: string | null | undefined): Promise<BroadcastProgress | null> {
  const counts = await prisma.broadcastRecipient.groupBy({
    by: ["status"],
    where: { broadcastId },
    _count: { _all: true }
  });
  const count = (status: string) => counts.find((c) => c.status === status)?._count._all ?? 0;
  const remaining = count("pending") + count("sending");

  const current = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
  if (!current) return null;
  const finished = current.status === "sending" && remaining === 0;

  const broadcast =
    current.status === "sending"
      ? await prisma.broadcast.update({
          where: { id: broadcastId },
          data: {
            sentCount: count("sent"),
            failedCount: count("failed"),
            ...(lastError !== undefined ? { lastError } : {}),
            ...(finished ? { status: "sent", sentAt: new Date(), lastError: null } : {})
          }
        })
      : current;

  return toProgress(broadcast, current.status === "sending" ? remaining : 0);
}

export function toProgress(broadcast: Broadcast, remaining: number): BroadcastProgress {
  return {
    id: broadcast.id,
    subject: broadcast.subject,
    status: broadcast.status,
    recipientCount: broadcast.recipientCount,
    sentCount: broadcast.sentCount,
    failedCount: broadcast.failedCount,
    remaining,
    lastError: broadcast.lastError,
    sentAt: broadcast.sentAt,
    createdAt: broadcast.createdAt
  };
}

/**
 * Sends batches of a broadcast until it's finished, sending stops early, or
 * `budgetMs` has passed. Call again to carry on.
 */
export async function sendBroadcast(broadcastId: string, budgetMs: number): Promise<BroadcastProgress | null> {
  const broadcast = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
  if (!broadcast) return null;
  if (broadcast.status !== "sending" || !broadcast.siteUrl) return progress(broadcastId, undefined);

  const started = Date.now();
  let stopped: string | null = null;
  await skipUnsubscribed(broadcastId);

  while (Date.now() - started < budgetMs) {
    const batch = await claimBatch(broadcastId);
    if (!batch) break;
    stopped = await sendBatch(broadcast, batch);
    if (stopped) break;
    await sleep(BATCH_GAP_MS);
  }

  return progress(broadcastId, stopped);
}

/** Carries on with every broadcast still going out, for the scheduled job. */
export async function resumeBroadcasts(budgetMs: number): Promise<BroadcastProgress[]> {
  const started = Date.now();
  const sending = await prisma.broadcast.findMany({
    where: { status: "sending" },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  const results: BroadcastProgress[] = [];
  for (const { id } of sending) {
    const left = budgetMs - (Date.now() - started);
    if (left <= 0) break;
    const result = await sendBroadcast(id, left);
    if (result) results.push(result);
  }
  return results;
}

/** Recipients still to send for each broadcast that's going out, for the list. */
export async function remainingByBroadcast(ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const rows = await prisma.broadcastRecipient.groupBy({
    by: ["broadcastId"],
    where: { broadcastId: { in: ids }, status: { in: ["pending", "sending"] } },
    _count: { _all: true }
  });
  return new Map(rows.map((r) => [r.broadcastId, r._count._all]));
}
