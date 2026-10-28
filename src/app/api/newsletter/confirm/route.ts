import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeSecurityEvent } from "@/lib/security/security-events";
import { clientIp } from "@/lib/security/rate-limit";

/**
 * Links in confirmation emails sent before WEB-18 come here: show the page
 * with the button instead of confirming on a visit, which mail scanners
 * make by themselves.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const page = new URL("/newsletter/confirm", url.origin);
  if (token) page.searchParams.set("token", token);
  return NextResponse.redirect(page, 303);
}

/** The button on /newsletter/confirm. */
export async function POST(req: Request) {
  const base = new URL(req.url).origin;
  const done = (query = "") => NextResponse.redirect(`${base}/newsletter/confirmed${query}`, 303);

  const form = await req.formData().catch(() => null);
  const token = form?.get("token");
  if (typeof token !== "string" || !token) {
    return done("?error=invalid-or-used");
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { confirmToken: token }
  });

  if (!subscriber) {
    await writeSecurityEvent({
      category: "newsletter",
      action: "confirm.invalid_token",
      ip: clientIp(req)
    });
    return done("?error=invalid-or-used");
  }

  if (subscriber.confirmTokenExpiresAt && subscriber.confirmTokenExpiresAt < new Date()) {
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { confirmToken: null, confirmTokenExpiresAt: null }
    });
    return done("?error=expired");
  }

  if (subscriber.status === "confirmed") {
    return done("?already=1");
  }

  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      confirmToken: null,
      confirmTokenExpiresAt: null
    }
  });

  return done();
}
