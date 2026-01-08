import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { deleteImage } from "@/lib/cloudinary";
import { z } from "zod";
import { revalidateTag } from "next/cache";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  featured: z.boolean().optional(),
  order: z.number().optional()
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const data = await prisma.galleryImage.update({
    where: { id },
    data: parsed.data
  });
  revalidateTag("gallery");
  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const image = await prisma.galleryImage.delete({ where: { id } });
  if (image?.cloudinaryId) {
    await deleteImage(image.cloudinaryId);
  }
  revalidateTag("gallery");
  return NextResponse.json({ success: true, message: "Image deleted" });
}


