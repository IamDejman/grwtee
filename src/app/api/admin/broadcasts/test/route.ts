import { getAuthOptions } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { broadcastWrapperHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/resend";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  to: z.string().email().optional()
});

export async function POST(req: Request) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
  }

  const { subject, html, to } = parsed.data;
  const recipient = to ?? session.user.email;

  const siteUrl =
    (await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL)) ||
    new URL(req.url).origin;
  const base = siteUrl.replace(/\/$/, "");
  const unsubscribeUrl = `${base}/api/newsletter/unsubscribe?token=preview`;

  const wrappedHtml = broadcastWrapperHtml({ contentHtml: html, unsubscribeUrl });

  const { error } = await sendEmail({
    to: recipient,
    subject: `[TEST] ${subject}`,
    html: wrappedHtml
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: "Failed to send test email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, sentTo: recipient });
}
