import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { serviceJson } from "@/lib/services";
import { z } from "zod";
import { revalidateTag } from "next/cache";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  priceUSD: z.number().nonnegative().nullable().optional(),
  priceNGN: z.number().nonnegative().nullable().optional(),
  priceNote: z.string().nullable().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  order: z.number().optional()
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
  }
  const { id } = await params;
  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const data = await prisma.service.update({
    where: { id },
    data: parsed.data
  });
  revalidateTag("services", "max");
  return NextResponse.json({ success: true, data: serviceJson(data) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
  }
  const { id } = await params;
  await prisma.service.delete({ where: { id } });
  revalidateTag("services", "max");
  return NextResponse.json({ success: true, message: "Service deleted" });
}


