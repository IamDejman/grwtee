import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/session-auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.subscriber.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Subscribers DELETE]", err);
    return NextResponse.json(
      { success: false, error: "Not found or delete failed" },
      { status: 404 }
    );
  }
}
