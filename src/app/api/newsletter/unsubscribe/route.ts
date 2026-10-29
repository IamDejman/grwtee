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

/**
 * The Unsubscribe link in a newsletter: shows the page with the button.
 * Opening the link no longer unsubscribes, because mail scanners open
 * links by themselves (WEB-18).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const page = new URL("/newsletter/unsubscribe", url.origin);
  if (token) page.searchParams.set("token", token);
  return NextResponse.redirect(page, 303);
}

/**
 * Two callers:
 * - One-click unsubscribe (RFC 8058): the Unsubscribe button mail apps show
 *   POSTs `List-Unsubscribe=One-Click` to the address in the email's
 *   List-Unsubscribe header, with the token in it. It needs a plain answer.
 * - The button on /newsletter/unsubscribe, with the token in the form; it
 *   goes on to the confirmation page.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const form = await req.formData().catch(() => null);
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";
  const formToken = form?.get("token");
  const token = url.searchParams.get("token") ?? (typeof formToken === "string" ? formToken : null);
  const found = !!token && (await unsubscribe(token));

  if (oneClick || !form?.has("token")) {
    return found
      ? NextResponse.json({ success: true })
      : NextResponse.json({ success: false, error: "Unknown unsubscribe link" }, { status: 404 });
  }
  return NextResponse.redirect(`${url.origin}/newsletter/unsubscribed${found ? "" : "?error=invalid"}`, 303);
}
