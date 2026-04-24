import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const base = url.origin;

  if (!token) {
    return NextResponse.redirect(`${base}/newsletter/unsubscribed?error=missing-token`);
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { unsubscribeToken: token }
  });

  if (!subscriber) {
    return NextResponse.redirect(`${base}/newsletter/unsubscribed?error=invalid`);
  }

  if (subscriber.status !== "unsubscribed") {
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        status: "unsubscribed",
        unsubscribedAt: new Date()
      }
    });
  }

  return NextResponse.redirect(`${base}/newsletter/unsubscribed`);
}
