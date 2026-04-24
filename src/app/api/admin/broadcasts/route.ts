import { getAuthOptions } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { broadcastWrapperHtml } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(1).max(200),
  html: z.string().min(1)
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function htmlToText(html: string): string {
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

export async function GET() {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const data = await prisma.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return NextResponse.json({ success: true, data });
}

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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid broadcast payload" },
      { status: 400 }
    );
  }

  const { subject, html } = parsed.data;
  const text = htmlToText(html);

  const broadcast = await prisma.broadcast.create({
    data: { subject, html, text }
  });

  const subscribers = await prisma.subscriber.findMany({
    where: { status: "confirmed" },
    select: { email: true, unsubscribeToken: true }
  });

  const siteUrl =
    (await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL)) ||
    new URL(req.url).origin;
  const base = siteUrl.replace(/\/$/, "");

  let sentCount = 0;
  let failedCount = 0;

  for (const s of subscribers) {
    const unsubscribeUrl = `${base}/api/newsletter/unsubscribe?token=${s.unsubscribeToken}`;
    const wrappedHtml = broadcastWrapperHtml({ contentHtml: html, unsubscribeUrl });
    const wrappedText = `${text}\n\n—\nUnsubscribe: ${unsubscribeUrl}`;
    const { error } = await sendEmail({
      to: s.email,
      subject,
      html: wrappedHtml,
      text: wrappedText
    });
    if (error) {
      failedCount += 1;
    } else {
      sentCount += 1;
    }
    await sleep(600);
  }

  const updated = await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: {
      sentAt: new Date(),
      sentCount,
      failedCount
    }
  });

  return NextResponse.json({
    success: true,
    data: updated,
    totalRecipients: subscribers.length
  });
}
