import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";

export const revalidate = 3600;

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(2),
  priceUSD: z.number().optional(),
  priceNGN: z.number().optional(),
  priceNote: z.string().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  order: z.number().optional()
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const active = searchParams.get("active");
  const featured = searchParams.get("featured");
  const where: any = {};
  if (active !== null) where.active = active === "true";
  if (featured !== null) where.featured = featured === "true";
  const data = await prisma.service.findMany({
    where,
    orderBy: [{ order: "asc" }, { createdAt: "desc" }]
  });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const data = await prisma.service.create({ data: parsed.data });
  revalidateTag("services");
  return NextResponse.json({ success: true, data });
}


