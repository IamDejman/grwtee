import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteAppAccount, findAppAccount, isStaffAccount, verifyDeletionToken } from "@/lib/app-accounts";
import { tooManyRequests } from "@/lib/security/public-form";
import { clientIp, consumeRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({ token: z.string().min(1).max(500) });

/** POST { token }: deletes the app account the emailed link is for. */
export async function POST(req: Request) {
  const limit = await consumeRateLimit(`account-deletion-confirm:${clientIp(req)}`, 10, 60 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  const userId = parsed.success ? verifyDeletionToken(parsed.data.token) : null;
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "This link has expired or isn't valid. Ask for a new one on the delete account page." },
      { status: 400 }
    );
  }

  const account = await findAppAccount(userId);
  // Opened twice, or deleted from the app in the meantime.
  if (!account) return NextResponse.json({ success: true, alreadyDeleted: true });
  if (isStaffAccount(account)) {
    return NextResponse.json({ success: false, error: "Stylist and admin accounts can't be deleted here." }, { status: 403 });
  }

  try {
    await deleteAppAccount(account.id);
  } catch (err) {
    console.error("[Account deletion] Failed for %s", account.id, err);
    return NextResponse.json(
      { success: false, error: "We couldn't delete the account just now. Try again in a moment." },
      { status: 500 }
    );
  }
  console.info("[Account deletion] Deleted app account %s from the website", account.id);
  return NextResponse.json({ success: true });
}
