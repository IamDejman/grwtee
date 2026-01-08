import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { getConfig, setConfig } from "@/lib/config";
import { NextResponse } from "next/server";
import { z } from "zod";

const envVarSchema = z.object({
  key: z.string().min(1),
  value: z.string()
});

const updateSchema = z.object({
  vars: z.array(envVarSchema)
});

// List of environment variables that can be managed
const MANAGED_ENV_VARS = [
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "CONTACT_EMAIL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_INSTAGRAM_URL",
  "NEXT_PUBLIC_CONTACT_EMAIL"
];

export async function GET() {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Get all env vars from DB, fallback to env vars
  const vars: Record<string, { value: string; source: "database" | "environment" }> = {};
  
  for (const key of MANAGED_ENV_VARS) {
    const dbValue = await getConfig(key);
    const envValue = process.env[key];
    
    if (dbValue) {
      vars[key] = { value: dbValue, source: "database" };
    } else if (envValue) {
      vars[key] = { value: envValue, source: "environment" };
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
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  // Validate that all keys are in the managed list
  for (const { key } of parsed.data.vars) {
    if (!MANAGED_ENV_VARS.includes(key)) {
      return NextResponse.json({ 
        success: false, 
        error: `Environment variable ${key} is not managed through this API` 
      }, { status: 400 });
    }
  }

  // Save to database
  for (const { key, value } of parsed.data.vars) {
    await setConfig(key, value);
  }

  return NextResponse.json({ success: true });
}

