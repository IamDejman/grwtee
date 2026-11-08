import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/security/session-auth";
import { requireStepUp } from "@/lib/security/step-up";
import { encryptionKeyMissing, jsonUnauthorized } from "@/lib/security/api-response";
import { EncryptionKeyMissingError } from "@/lib/security/field-encryption";
import {
  encryptTotpSecret,
  generateTotpSecret,
  getTotpUri,
  verifyTotpCode,
  verifyTotpCodeOnce,
  decryptTotpSecret
} from "@/lib/security/mfa";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";
import { adminMfaRequired } from "@/lib/auth";

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
  currentPassword: z.string().min(1),
  // Replacing an authenticator that's already set up (a new phone).
  currentCode: z.string().length(6).optional()
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

  // Moving two-step sign-in to a new authenticator takes a code from the
  // current one: a password alone (a stolen one, say) mustn't be enough to
  // take it over (WEB-15).
  const admin = await prisma.admin.findUnique({ where: { id: session.user.id } });
  if (!admin) return jsonUnauthorized();
  if (admin.mfaEnabled) {
    const currentSecret = decryptTotpSecret(admin.mfaSecret);
    if (
      !parsed.data.currentCode ||
      !currentSecret ||
      !(await verifyTotpCodeOnce(admin.id, currentSecret, parsed.data.currentCode, admin.mfaLastTimeStep))
    ) {
      return NextResponse.json(
        { success: false, error: "Enter a current code from the authenticator app you use now." },
        { status: 400 }
      );
    }
  }

  if (!verifyTotpCode(parsed.data.secret, parsed.data.code)) {
    return NextResponse.json({ success: false, error: "Invalid authenticator code" }, { status: 400 });
  }

  let mfaSecret: string;
  try {
    mfaSecret = encryptTotpSecret(parsed.data.secret);
  } catch (err) {
    if (err instanceof EncryptionKeyMissingError) return encryptionKeyMissing();
    throw err;
  }

  await prisma.admin.update({
    where: { id: session.user.id },
    data: { mfaEnabled: true, mfaSecret }
  });

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: session.user.id,
    action: admin.mfaEnabled ? "admin.mfa.replaced" : "admin.mfa.enabled",
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

  if (adminMfaRequired()) {
    return NextResponse.json(
      { success: false, error: "Two-step sign-in is required for admin accounts." },
      { status: 400 }
    );
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
  if (!secret || !(await verifyTotpCodeOnce(admin.id, secret, parsed.data.code, admin.mfaLastTimeStep))) {
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
