import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { greeting, waitlistConfirmHtml } from "@/lib/email-templates";

import { parseEmail } from "@/lib/security/email-validation";
import { guardPublicForm, turnstileTokenOf } from "@/lib/security/public-form";

const schema = z.object({
  email: z.string().max(254),
  name: z.string().trim().min(1).max(120).optional(),
  source: z.string().trim().max(60).optional()
});

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

  const refused = await guardPublicForm(req, {
    form: "waitlist",
    limit: 5,
    windowMs: 60 * 60_000,
    turnstileToken: turnstileTokenOf(body)
  });
  if (refused) return refused;

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
    text: `${greeting(name)}\n\nYou're on the Inner Circle waiting list. When the doors open, you'll be among the first to know.\n\nOutfits sorted.\nGRWTEE`
  });

  if (error) {
    console.error("[Waitlist] Confirmation send failed:", error);
  }

  return NextResponse.json({
    success: true,
    message: "You're on the list. Check your inbox for confirmation."
  });
}
