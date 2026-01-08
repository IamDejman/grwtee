import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";

export const revalidate = 3600;

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url(),
  cloudinaryId: z.string().min(1),
  category: z.string().min(1),
  featured: z.boolean().optional(),
  order: z.number().optional()
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const limit = parseInt(searchParams.get("limit") || "0", 10);
    const where: any = {};
    if (category) where.category = category;
    if (featured !== null) where.featured = featured === "true";
    const data = await prisma.galleryImage.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      ...(limit ? { take: limit } : {})
    });
    const total = await prisma.galleryImage.count({ where });
    return NextResponse.json({ success: true, data, total });
  } catch (error: any) {
    const isConnectionError =
      error?.code === "P1001" ||
      error?.message?.includes("Can't reach database server") ||
      error?.message?.includes("connection");
    
    if (isConnectionError) {
      return NextResponse.json(
        { success: false, error: "Database connection unavailable", data: [], total: 0 },
        { status: 503 }
      );
    }
    throw error;
  }
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
  const data = await prisma.galleryImage.create({ data: parsed.data });
  revalidateTag("gallery");
  return NextResponse.json({ success: true, data });
}


