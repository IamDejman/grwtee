import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { setConfig } from "@/lib/config";
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

const removeSchema = z.object({
  key: z.string().min(1),
  currentPassword: z.string().min(1)
});

const EDITABLE_ENV_VARS = [
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "RESEND_FROM",
  "CONTACT_EMAIL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_INSTAGRAM_URL",
  "NEXT_PUBLIC_CONTACT_EMAIL",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID"
];

// Secrets are set only in Vercel's environment variables, never stored here:
// anyone who can read the database would otherwise have every key. A copy
// saved here before this change keeps working until it's removed.
const SECRET_ENV_VARS = ["NEXTAUTH_SECRET", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "RESEND_API_KEY"];

const MANAGED_ENV_VARS = [...EDITABLE_ENV_VARS, ...SECRET_ENV_VARS];

type EnvRow = {
  value: string;
  source: "database" | "environment";
  editable: boolean;
  inDatabase: boolean;
  inEnvironment: boolean;
};

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
  }

  const stored = await prisma.siteSettings.findMany({
    where: { key: { in: MANAGED_ENV_VARS.map((key) => `env_${key}`) } },
    select: { key: true, value: true }
  });
  const inDatabase = new Set(stored.filter((row) => row.value).map((row) => row.key.replace(/^env_/, "")));

  const vars: Record<string, EnvRow> = {};
  for (const key of MANAGED_ENV_VARS) {
    const inDb = inDatabase.has(key);
    const inEnv = Boolean(process.env[key]);
    vars[key] = {
      value: inDb || inEnv ? "[configured]" : "",
      source: inDb ? "database" : "environment",
      editable: EDITABLE_ENV_VARS.includes(key),
      inDatabase: inDb,
      inEnvironment: inEnv
    };
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

  for (const { key } of parsed.data.vars) {
    if (SECRET_ENV_VARS.includes(key)) {
      return NextResponse.json(
        { success: false, error: "API keys and the sign-in secret are set in Vercel, not here." },
        { status: 400 }
      );
    }
    if (!EDITABLE_ENV_VARS.includes(key)) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }
  }

  const stepUp = await requireStepUp(session.user.email, parsed.data.currentPassword);
  if (!stepUp.ok) {
    return NextResponse.json({ success: false, error: stepUp.message }, { status: 403 });
  }

  for (const { key, value } of parsed.data.vars) {
    await setConfig(key, value);
  }
  revalidateTag("config", "max");

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

/** Removes the copy of a setting stored in the database, so the environment value is used. */
export async function DELETE(req: Request) {
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

  const parsed = removeSchema.safeParse(json);
  if (!parsed.success || !MANAGED_ENV_VARS.includes(parsed.data.key)) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const stepUp = await requireStepUp(session.user.email, parsed.data.currentPassword);
  if (!stepUp.ok) {
    return NextResponse.json({ success: false, error: stepUp.message }, { status: 403 });
  }

  await prisma.siteSettings.deleteMany({ where: { key: `env_${parsed.data.key}` } });
  revalidateTag("config", "max");

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: session.user.id,
    action: "settings.env.remove",
    resource: "site_settings",
    metadata: { key: parsed.data.key },
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return NextResponse.json({ success: true });
}
