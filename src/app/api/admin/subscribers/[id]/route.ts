import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(await getAuthOptions());
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
