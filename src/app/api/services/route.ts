import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { serviceJson } from "@/lib/services";
import { z } from "zod";
import { revalidateTag } from "next/cache";

export const revalidate = 3600;

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(2),
  priceUSD: z.number().nonnegative().nullable().optional(),
  priceNGN: z.number().nonnegative().nullable().optional(),
  priceNote: z.string().nullable().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  order: z.number().optional()
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const active = searchParams.get("active");
  const featured = searchParams.get("featured");
  const where: { active?: boolean; featured?: boolean } = {};
  // Hidden services are only for the dashboard (WEB-22).
  if (!(await requireAdminSession())) where.active = true;
  else if (active !== null) where.active = active === "true";
  if (featured !== null) where.featured = featured === "true";
  const data = await prisma.service.findMany({
    where,
    orderBy: [{ order: "asc" }, { createdAt: "desc" }]
  });
  return NextResponse.json({ success: true, data: data.map(serviceJson) });
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
  }
  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const data = await prisma.service.create({ data: parsed.data });
  revalidateTag("services", "max");
  return NextResponse.json({ success: true, data: serviceJson(data) });
}


