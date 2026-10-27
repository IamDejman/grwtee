import { NextResponse } from "next/server";
import { z } from "zod";
import { DELETION_LINK_HOURS, deletionToken, findAppAccountByEmail, isStaffAccount } from "@/lib/app-accounts";
import { getConfig } from "@/lib/config";
import { accountDeletionConfirmHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/resend";
import { parseEmail } from "@/lib/security/email-validation";
import { guardPublicForm, tooManyRequests, turnstileTokenOf } from "@/lib/security/public-form";
import { consumeRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().max(254) });

// The same answer whether or not there's an account, so the form can't be
// used to find out who uses the app.
const SENT = `If there's a GRWTEE app account for that email, we've sent it a link to confirm. The link works for ${DELETION_LINK_HOURS} hours.`;

/** POST { email, turnstileToken }: emails a link that confirms deleting the account. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  const email = parsed.success ? parseEmail(parsed.data.email) : null;
  if (!email?.ok) {
    return NextResponse.json({ success: false, error: email?.message ?? "Enter the email address you use in the app." }, { status: 400 });
  }

  const refused = await guardPublicForm(req, {
    form: "account-deletion",
    limit: 5,
    windowMs: 60 * 60_000,
    turnstileToken: turnstileTokenOf(body)
  });
  if (refused) return refused;

  const perAddress = await consumeRateLimit(`account-deletion:${email.email}`, 3, 24 * 60 * 60_000);
  if (!perAddress.ok) return tooManyRequests(perAddress.retryAfterSeconds);

  const account = await findAppAccountByEmail(email.email);
  if (account && !isStaffAccount(account)) {
    const siteUrl =
      (await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL)) || new URL(req.url).origin;
    const confirmUrl = `${siteUrl.replace(/\/$/, "")}/delete-account/confirm?token=${deletionToken(account.id)}`;
    const { error } = await sendEmail({
      to: email.email,
      subject: "Confirm deleting your GRWTEE account",
      html: accountDeletionConfirmHtml({ confirmUrl, hours: DELETION_LINK_HOURS }),
      text: `Someone asked to delete the GRWTEE app account for this email address. To confirm, open this link within ${DELETION_LINK_HOURS} hours: ${confirmUrl}\n\nIf you didn't ask for this, ignore this email: nothing changes unless the link is used.`
    });
    if (error) {
      console.error("[Account deletion] Confirmation email failed", error);
      return NextResponse.json({ success: false, error: "We couldn't send the email. Try again in a few minutes." }, { status: 502 });
    }
  }

  return NextResponse.json({ success: true, message: SENT });
}
