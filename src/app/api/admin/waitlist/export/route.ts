import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/session-auth";
import { csvRows } from "@/lib/csv";


export async function GET() {
  const session = await requireAdminSession();
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: "desc" }
  });

  // Names and sources come from the public form, so they're escaped (WEB-24).
  const csv = csvRows(
    ["email", "name", "source", "createdAt"],
    entries.map((e) => [e.email, e.name ?? "", e.source ?? "", e.createdAt.toISOString()])
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
