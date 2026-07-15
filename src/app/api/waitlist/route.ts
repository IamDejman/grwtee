import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { waitlistConfirmHtml } from "@/lib/email-templates";

import { parseEmail } from "@/lib/security/email-validation";

const schema = z.object({
  email: z.string(),
  name: z.string().trim().min(1).max(120).optional(),
  source: z.string().trim().max(60).optional()
});

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
  const name = parsed.data.name?.trim() || null;
  const source = parsed.data.source?.trim() || "inner-circle";

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const key = `waitlist::${ip}::${email}`;

  if (rateLimited(key)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }
  bump(key);

  const existing = await prisma.waitlistEntry.findUnique({ where: { email } });

  if (existing) {
    return NextResponse.json({
      success: true,
      message: "You're already on the list. We'll be in touch when doors open.",
      alreadyOnList: true
    });
  }

  await prisma.waitlistEntry.create({
    data: { email, name, source }
  });

  const { error } = await sendEmail({
    to: email,
    subject: "You're on the Inner Circle list",
    html: waitlistConfirmHtml({ name }),
    text: `${name ? `Hi ${name},\n\n` : ""}You're on the Inner Circle waiting list. When the doors open, you'll be among the first to know.\n\nOutfits sorted.\nGRWTEE`
  });

  if (error) {
    console.error("[Waitlist] Confirmation send failed:", error);
  }

  return NextResponse.json({
    success: true,
    message: "You're on the list. Check your inbox for confirmation."
  });
}
