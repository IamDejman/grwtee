import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/session-auth";
import { clampLimit } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  // "?page=abc" used to make every query fail.
  const page = clampLimit(searchParams.get("page"), 1, 100_000);
  const pageSize = 20;
  const [data, total] = await Promise.all([
    prisma.waitlistEntry.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.waitlistEntry.count(),
  ]);
  return NextResponse.json({ success: true, data, total, page, pageSize });
}
