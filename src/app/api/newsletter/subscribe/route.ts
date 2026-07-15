import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { getConfig } from "@/lib/config";
import { subscribeConfirmHtml } from "@/lib/email-templates";

import { parseEmail } from "@/lib/security/email-validation";

const schema = z.object({ email: z.string() });

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
type RL = { count: number; firstAt: number };
const recent = new Map<string, RL>();

function rateLimited(key: string) {
  const now = Date.now();
  const prev = recent.get(key);
  if (!prev) return false;
  if (now - prev.firstAt > RATE_LIMIT_WINDOW_MS) {
    recent.delete(key);
    return false;
  }
  return prev.count >= RATE_LIMIT_MAX;
}
function bump(key: string) {
  const now = Date.now();
  const prev = recent.get(key);
  if (!prev || now - prev.firstAt > RATE_LIMIT_WINDOW_MS) {
    recent.set(key, { count: 1, firstAt: now });
    return;
  }
  recent.set(key, { count: prev.count + 1, firstAt: prev.firstAt });
}

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
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const key = `${ip}::${email}`;

  if (rateLimited(key)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }
  bump(key);

  const existing = await prisma.subscriber.findUnique({ where: { email } });

  if (existing && existing.status === "confirmed") {
    return NextResponse.json({
      success: true,
      message: "You're already subscribed."
    });
  }

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
