import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const where: Record<string, unknown> = {};
  if (status && ["pending", "confirmed", "unsubscribed"].includes(status)) {
    where.status = status;
  }
  const [data, total, confirmedCount, pendingCount, unsubscribedCount] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500
    }),
    prisma.subscriber.count({ where }),
    prisma.subscriber.count({ where: { status: "confirmed" } }),
    prisma.subscriber.count({ where: { status: "pending" } }),
    prisma.subscriber.count({ where: { status: "unsubscribed" } })
  ]);
  return NextResponse.json({
    success: true,
    data,
    total,
    counts: {
      confirmed: confirmedCount,
      pending: pendingCount,
      unsubscribed: unsubscribedCount
    }
  });
}
