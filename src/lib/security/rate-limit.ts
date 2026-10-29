import { prisma } from "@/lib/prisma";

/**
 * Rate limits kept in the database, so they hold across server instances and
 * deploys (an in-memory counter resets on each). Each key counts requests in
 * a fixed window that starts with the first request.
 */

type Bucket = { count: number; windowStart: Date };

/** Old buckets are cleared now and then rather than on a schedule. */
async function maybePrune(): Promise<void> {
  if (Math.random() >= 0.02) return;
  await prisma.rateLimitBucket
    .deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 2 * 24 * 60 * 60_000) } } })
    .catch(() => {});
}

/**
 * Counts one request against `key` and says whether it's within `limit` per
 * `windowMs`. Counting and checking happen in one statement, so requests
 * arriving together can't all slip under the limit.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  // Prisma stores DateTime as UTC without a time zone, so compare in UTC.
  const rows = await prisma.$queryRaw<Bucket[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart")
    VALUES (${key}, 1, timezone('utc', now()))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."windowStart" <= timezone('utc', now()) - make_interval(secs => ${windowMs / 1000}::float8) THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" <= timezone('utc', now()) - make_interval(secs => ${windowMs / 1000}::float8) THEN timezone('utc', now())
        ELSE "RateLimitBucket"."windowStart"
      END
    RETURNING "count", "windowStart"`;
  void maybePrune();

  const bucket = rows[0];
  const ok = bucket.count <= limit;
  const resetAt = bucket.windowStart.getTime() + windowMs;
  return { ok, retryAfterSeconds: ok ? 0 : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) };
}

/** Whether `key` has reached `limit` in the current window, without counting. */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
  if (!bucket) return false;
  if (bucket.windowStart.getTime() <= Date.now() - windowMs) return false;
  return bucket.count >= limit;
}

/** Forget a key, for example after a successful sign-in. */
export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({ where: { key } });
}

/** The caller's IP address as the edge network reports it. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
