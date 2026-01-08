import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export const revalidate = 300;

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  service: z.string().min(2),
  message: z.string().min(2)
});

export async function GET(req: Request) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const where: any = {};
  if (status) where.status = status;
  const data = await prisma.bookingRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit
  });
  const total = await prisma.bookingRequest.count({ where });
  return NextResponse.json({ success: true, data, total });
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  await prisma.bookingRequest.create({ data: parsed.data });
  return NextResponse.json({
    success: true,
    message: "Booking request submitted"
  });
}


