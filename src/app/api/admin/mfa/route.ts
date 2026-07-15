import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/security/session-auth";
import { requireStepUp } from "@/lib/security/step-up";
import { jsonUnauthorized } from "@/lib/security/api-response";
import {
  encryptTotpSecret,
  generateTotpSecret,
  getTotpUri,
  verifyTotpCode,
  decryptTotpSecret
} from "@/lib/security/mfa";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";

export async function GET() {
  const session = await requireAdminSession();
  if (!session?.user?.email || !session.user.id) {
    return jsonUnauthorized();
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.user.id } });
  if (!admin) return jsonUnauthorized();

  const secret = generateTotpSecret();
  const uri = getTotpUri(admin.email, secret);
  const qrDataUrl = await QRCode.toDataURL(uri);

  return NextResponse.json({
    success: true,
    data: {
      secret,
      qrDataUrl,
      mfaEnabled: admin.mfaEnabled
    }
  });
}

const enableSchema = z.object({
  secret: z.string().min(16),
  code: z.string().length(6),
  currentPassword: z.string().min(1)
});

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.email || !session.user.id) {
    return jsonUnauthorized();
  }

  const json = await req.json();
  const parsed = enableSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const stepUp = await requireStepUp(session.user.email, parsed.data.currentPassword);
  if (!stepUp.ok) {
    return NextResponse.json({ success: false, error: stepUp.message }, { status: 403 });
  }

  if (!verifyTotpCode(parsed.data.secret, parsed.data.code)) {
    return NextResponse.json({ success: false, error: "Invalid authenticator code" }, { status: 400 });
  }

  await prisma.admin.update({
    where: { id: session.user.id },
    data: {
      mfaEnabled: true,
      mfaSecret: encryptTotpSecret(parsed.data.secret)
    }
  });

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: session.user.id,
    action: "admin.mfa.enabled",
    resource: "admin",
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return NextResponse.json({ success: true });
}

const disableSchema = z.object({
  currentPassword: z.string().min(1),
  code: z.string().length(6)
});

export async function DELETE(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.email || !session.user.id) {
    return jsonUnauthorized();
  }

  const json = await req.json();
  const parsed = disableSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const stepUp = await requireStepUp(session.user.email, parsed.data.currentPassword);
  if (!stepUp.ok) {
    return NextResponse.json({ success: false, error: stepUp.message }, { status: 403 });
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.user.id } });
  if (!admin?.mfaSecret) {
    return NextResponse.json({ success: false, error: "MFA is not enabled" }, { status: 400 });
  }

  const secret = decryptTotpSecret(admin.mfaSecret);
  if (!secret || !verifyTotpCode(secret, parsed.data.code)) {
    return NextResponse.json({ success: false, error: "Invalid authenticator code" }, { status: 400 });
  }

  await prisma.admin.update({
    where: { id: session.user.id },
    data: { mfaEnabled: false, mfaSecret: null }
  });

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: session.user.id,
    action: "admin.mfa.disabled",
    resource: "admin",
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return NextResponse.json({ success: true });
}
