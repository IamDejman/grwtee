import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { getConfig } from "@/lib/config";
import { subscribeConfirmHtml } from "@/lib/email-templates";

import { parseEmail } from "@/lib/security/email-validation";
import { guardPublicForm, tooManyRequests, turnstileTokenOf } from "@/lib/security/public-form";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ email: z.string().max(254) });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
  }

  const emailResult = parseEmail(parsed.data.email);
  if (!emailResult.ok) {
    return NextResponse.json({ success: false, error: emailResult.message }, { status: 400 });
  }

  const email = emailResult.email;
  const refused = await guardPublicForm(req, {
    form: "newsletter",
    limit: 5,
    windowMs: 60 * 60_000,
    turnstileToken: turnstileTokenOf(body)
  });
  if (refused) return refused;

  const existing = await prisma.subscriber.findUnique({ where: { email } });

  if (existing && existing.status === "confirmed") {
    return NextResponse.json({
      success: true,
      message: "You're already subscribed."
    });
  }

  // However many addresses send it, one inbox gets a few confirmation emails a day at most.
  const perAddress = await consumeRateLimit(`newsletter-confirm:${email}`, 3, 24 * 60 * 60_000);
  if (!perAddress.ok) return tooManyRequests(perAddress.retryAfterSeconds);

  const confirmToken = randomUUID();
  const confirmTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const unsubscribeToken = existing?.unsubscribeToken ?? randomUUID();

  const subscriber = await prisma.subscriber.upsert({
    where: { email },
    update: { status: "pending", confirmToken, confirmTokenExpiresAt },
    create: {
      email,
      status: "pending",
      confirmToken,
      confirmTokenExpiresAt,
      unsubscribeToken
    }
  });

  const siteUrl =
    (await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL)) ||
    new URL(req.url).origin;
  const confirmUrl = `${siteUrl.replace(/\/$/, "")}/api/newsletter/confirm?token=${confirmToken}`;

  const { error } = await sendEmail({
    to: subscriber.email,
    subject: "Confirm your GRWTEE subscription",
    html: subscribeConfirmHtml({ confirmUrl }),
    text: `Confirm your GRWTEE subscription by opening this link: ${confirmUrl}`
  });

  if (error) {
    console.error("[Newsletter] Confirmation send failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send confirmation email." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Check your inbox to confirm your subscription."
  });
}
