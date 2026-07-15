import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized } from "@/lib/security/api-response";

const statusSchema = z.object({
  status: z.enum(["pending", "contacted", "confirmed", "completed"])
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
  }

  const { id } = await params;
  const data = await prisma.bookingRequest.findUnique({ where: { id } });
  if (!data) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return jsonUnauthorized();
  }
  const { id } = await params;
  const json = await req.json();
  const parsed = statusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const data = await prisma.bookingRequest.update({
    where: { id },
    data: { status: parsed.data.status }
  });
  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return jsonUnauthorized();
  }
  const { id } = await params;
  await prisma.bookingRequest.delete({ where: { id } });
  return NextResponse.json({ success: true, message: "Booking deleted" });
}
