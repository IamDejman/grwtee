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
    where: { confirmToken: token }
  });

  if (!subscriber) {
    return NextResponse.redirect(`${base}/newsletter/confirmed?error=invalid-or-used`);
  }

  if (subscriber.status === "confirmed") {
    return NextResponse.redirect(`${base}/newsletter/confirmed?already=1`);
  }

  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      confirmToken: null
    }
  });

  return NextResponse.redirect(`${base}/newsletter/confirmed`);
}
