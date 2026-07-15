import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { requireAdminSession } from "@/lib/security/session-auth";

const schema = z.object({
  siteTitle: z.string().min(1).optional(),
  instagramUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  businessHours: z.string().optional(),
  adminEmailNotifications: z.boolean().optional(),
  // Invoice-specific
  invoiceBusinessName: z.string().optional(),
  invoiceBusinessAddress: z.string().optional(),
  invoiceVatNumber: z.string().optional(),
  invoiceFooterTerms: z.string().optional()
});

async function getSettingsMap() {
  const rows = await prisma.siteSettings.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
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
      invoiceBusinessName: map.invoiceBusinessName || "",
      invoiceBusinessAddress: map.invoiceBusinessAddress || "",
      invoiceVatNumber: map.invoiceVatNumber || "",
      invoiceFooterTerms: map.invoiceFooterTerms || ""
    }
  });
}

export async function PUT(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.email || !session.user.id) {
    return jsonUnauthorized();
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
  if (data.invoiceBusinessName !== undefined)
    entries.push(["invoiceBusinessName", data.invoiceBusinessName]);
  if (data.invoiceBusinessAddress !== undefined)
    entries.push(["invoiceBusinessAddress", data.invoiceBusinessAddress]);
  if (data.invoiceVatNumber !== undefined)
    entries.push(["invoiceVatNumber", data.invoiceVatNumber]);
  if (data.invoiceFooterTerms !== undefined)
    entries.push(["invoiceFooterTerms", data.invoiceFooterTerms]);

  for (const [key, value] of entries) {
    await prisma.siteSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: session.user.id,
    action: "settings.update",
    resource: "site_settings",
    metadata: { keys: entries.map(([key]) => key) },
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return NextResponse.json({ success: true });
}


