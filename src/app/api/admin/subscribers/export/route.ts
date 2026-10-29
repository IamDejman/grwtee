import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/session-auth";
import { csvRows } from "@/lib/csv";


export async function GET() {
  const session = await requireAdminSession();
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const subscribers = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" }
  });

  const csv = csvRows(
    ["email", "status", "confirmedAt", "unsubscribedAt", "createdAt"],
    subscribers.map((s) => [
      s.email,
      s.status,
      s.confirmedAt?.toISOString() ?? "",
      s.unsubscribedAt?.toISOString() ?? "",
      s.createdAt.toISOString()
    ])
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
