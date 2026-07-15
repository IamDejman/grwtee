import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getConfig, setConfig } from "@/lib/config";
import { requireStepUp } from "@/lib/security/step-up";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { requireAdminSession } from "@/lib/security/session-auth";

const envVarSchema = z.object({
  key: z.string().min(1),
  value: z.string()
});

const updateSchema = z.object({
  vars: z.array(envVarSchema),
  currentPassword: z.string().min(1)
});

const MANAGED_ENV_VARS = [
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "CONTACT_EMAIL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_INSTAGRAM_URL",
  "NEXT_PUBLIC_CONTACT_EMAIL",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID"
];

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
  }

  const vars: Record<string, { value: string; source: "database" | "environment" }> = {};

  for (const key of MANAGED_ENV_VARS) {
    const dbValue = await getConfig(key);
    const envValue = process.env[key];

    if (dbValue) {
      vars[key] = { value: "[configured]", source: "database" };
    } else if (envValue) {
      vars[key] = { value: "[configured]", source: "environment" };
    } else {
      vars[key] = { value: "", source: "environment" };
    }
  }

  return NextResponse.json({
    success: true,
    data: vars
  });
}

export async function PUT(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.email || !session.user.id) {
    return jsonUnauthorized();
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const stepUp = await requireStepUp(session.user.email, parsed.data.currentPassword);
  if (!stepUp.ok) {
    return NextResponse.json({ success: false, error: stepUp.message }, { status: 403 });
  }

  for (const { key } of parsed.data.vars) {
    if (!MANAGED_ENV_VARS.includes(key)) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }
  }

  for (const { key, value } of parsed.data.vars) {
    await setConfig(key, value);
  }

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: session.user.id,
    action: "settings.env.update",
    resource: "site_settings",
    metadata: { keys: parsed.data.vars.map((v) => v.key) },
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return NextResponse.json({ success: true });
}
