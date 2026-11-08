import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Unsubscribes the subscriber with this token. False when there's no such token. */
async function unsubscribe(token: string): Promise<boolean> {
  const subscriber = await prisma.subscriber.findUnique({
    where: { unsubscribeToken: token }
  });
  if (!subscriber) return false;

  if (subscriber.status !== "unsubscribed") {
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        status: "unsubscribed",
        unsubscribedAt: new Date()
      }
    });
  }
  return true;
}

/** The Unsubscribe link in a newsletter: unsubscribes, then shows the confirmation page. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const base = url.origin;

  if (!token) {
    return NextResponse.redirect(`${base}/newsletter/unsubscribed?error=missing-token`);
  }

  if (!(await unsubscribe(token))) {
    return NextResponse.redirect(`${base}/newsletter/unsubscribed?error=invalid`);
  }

  return NextResponse.redirect(`${base}/newsletter/unsubscribed`);
}

/**
 * One-click unsubscribe (RFC 8058): the Unsubscribe button mail apps show
 * POSTs `List-Unsubscribe=One-Click` to the address in the email's
 * List-Unsubscribe header. It needs a plain answer, not a page.
 */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || !(await unsubscribe(token))) {
    return NextResponse.json({ success: false, error: "Unknown unsubscribe link" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
