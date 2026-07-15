import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeSecurityEvent } from "@/lib/security/security-events";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const base = url.origin;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  if (!token) {
    return NextResponse.redirect(`${base}/newsletter/unsubscribed?error=missing-token`);
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { confirmToken: token }
  });

  if (!subscriber) {
    await writeSecurityEvent({
      category: "newsletter",
      action: "confirm.invalid_token",
      ip
    });
    return NextResponse.redirect(`${base}/newsletter/confirmed?error=invalid-or-used`);
  }

  if (
    subscriber.confirmTokenExpiresAt &&
    subscriber.confirmTokenExpiresAt < new Date()
  ) {
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { confirmToken: null, confirmTokenExpiresAt: null }
    });
    return NextResponse.redirect(`${base}/newsletter/confirmed?error=expired`);
  }

  if (subscriber.status === "confirmed") {
    return NextResponse.redirect(`${base}/newsletter/confirmed?already=1`);
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

  return NextResponse.redirect(`${base}/newsletter/confirmed`);
}
