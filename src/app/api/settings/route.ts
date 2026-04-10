import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  siteTitle: z.string().min(1).optional(),
  instagramUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  businessHours: z.string().optional(),
  adminEmailNotifications: z.boolean().optional(),
  invoicePaymentDetails: z.string().optional()
});

async function getSettingsMap() {
  const rows = await prisma.siteSettings.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function GET() {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const map = await getSettingsMap();
  const instagramUrl = map.instagramUrl || await getConfig("NEXT_PUBLIC_INSTAGRAM_URL", process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/grwtee");
  const contactEmail = map.contactEmail || await getConfig("NEXT_PUBLIC_CONTACT_EMAIL", process.env.NEXT_PUBLIC_CONTACT_EMAIL || "book@grwtee.com");
  
  return NextResponse.json({
    success: true,
    data: {
      siteTitle: map.siteTitle || "GRWTEE",
      instagramUrl: instagramUrl || "https://instagram.com/grwtee",
      contactEmail: contactEmail || "book@grwtee.com",
      businessHours: map.businessHours || "Mon–Fri: 9:00 AM – 6:00 PM WAT\nSaturday: By Appointment Only\nSunday: Closed",
      adminEmailNotifications: map.adminEmailNotifications
        ? map.adminEmailNotifications === "true"
        : true,
      invoicePaymentDetails: map.invoicePaymentDetails || ""
    }
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const entries: Array<[string, string]> = [];
  if (data.siteTitle !== undefined) entries.push(["siteTitle", data.siteTitle]);
  if (data.instagramUrl !== undefined) entries.push(["instagramUrl", data.instagramUrl]);
  if (data.contactEmail !== undefined) entries.push(["contactEmail", data.contactEmail]);
  if (data.businessHours !== undefined) entries.push(["businessHours", data.businessHours]);
  if (data.adminEmailNotifications !== undefined)
    entries.push(["adminEmailNotifications", String(data.adminEmailNotifications)]);
  if (data.invoicePaymentDetails !== undefined)
    entries.push(["invoicePaymentDetails", data.invoicePaymentDetails]);

  for (const [key, value] of entries) {
    await prisma.siteSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  return NextResponse.json({ success: true });
}


