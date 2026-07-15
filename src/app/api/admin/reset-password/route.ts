import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security/password-hash";
import { validatePassword } from "@/lib/security/password-policy";
import {
  GENERIC_RESET_FAILURE,
  GENERIC_RESET_SUCCESS
} from "@/lib/security/api-response";
import { writeSecurityEvent } from "@/lib/security/security-events";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";
import { invalidateAdminSessions } from "@/lib/auth";

const OTP_MAX_ATTEMPTS = 5;

const schema = z.object({
  email: z.string().email(),
  resetToken: z.string().uuid(),
  otp: z.string().length(6),
  newPassword: z.string().min(12),
  confirmPassword: z.string().min(12)
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: GENERIC_RESET_FAILURE }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: GENERIC_RESET_FAILURE }, { status: 400 });
  }

  const { email, resetToken, otp, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ success: false, error: GENERIC_RESET_FAILURE }, { status: 400 });
  }

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.ok) {
    return NextResponse.json({ success: false, error: GENERIC_RESET_FAILURE }, { status: 400 });
  }

  const emailLower = email.trim().toLowerCase();

  const row = await prisma.passwordResetOtp.findFirst({
    where: { email: emailLower, resetToken },
    orderBy: { createdAt: "desc" }
  });

  if (!row || new Date() > row.expiresAt) {
    if (row) {
      await prisma.passwordResetOtp.deleteMany({ where: { email: emailLower } });
    }
    return NextResponse.json({ success: false, error: GENERIC_RESET_FAILURE }, { status: 400 });
  }

  if (row.attemptCount >= OTP_MAX_ATTEMPTS) {
    await prisma.passwordResetOtp.deleteMany({ where: { email: emailLower } });
    return NextResponse.json({ success: false, error: GENERIC_RESET_FAILURE }, { status: 400 });
  }

  if (row.otp !== otp) {
    const nextAttempts = row.attemptCount + 1;
    await writeSecurityEvent({
      category: "auth",
      action: "admin.otp.failed",
      metadata: { email: emailLower, attempts: nextAttempts },
      ip: requestMeta(req).ip
    });
    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      await prisma.passwordResetOtp.deleteMany({ where: { email: emailLower } });
    } else {
      await prisma.passwordResetOtp.update({
        where: { id: row.id },
        data: { attemptCount: nextAttempts }
      });
    }
    return NextResponse.json({ success: false, error: GENERIC_RESET_FAILURE }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { email: emailLower } });
  if (!admin) {
    await prisma.passwordResetOtp.deleteMany({ where: { email: emailLower } });
    return NextResponse.json({ success: false, error: GENERIC_RESET_FAILURE }, { status: 400 });
  }

  const hashed = await hashPassword(newPassword);
  await invalidateAdminSessions(admin.id);
  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      password: hashed,
      mustChangePassword: false
    }
  });
  await prisma.passwordResetOtp.deleteMany({ where: { email: emailLower } });

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: admin.id,
    action: "admin.password.reset",
    resource: "admin",
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return NextResponse.json({ success: true, message: GENERIC_RESET_SUCCESS });
}
