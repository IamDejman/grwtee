import { timingSafeEqual } from "crypto";

/** Scheduled jobs send `Authorization: Bearer $CRON_SECRET`. False when the secret isn't set. */
export function cronAuthorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
