import { NextResponse } from "next/server";
import { randomInt, randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { parseEmail } from "@/lib/security/email-validation";
import { safeError } from "@/lib/security/logger";

const OTP_EXPIRY_MINUTES = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const recentRequests = new Map<string, number>();

function isRateLimited(email: string): boolean {
  const key = email.toLowerCase();
  const last = recentRequests.get(key);
  if (!last) return false;
  return Date.now() - last < RATE_LIMIT_WINDOW_MS;
}

function recordRequest(email: string): void {
  recentRequests.set(email.toLowerCase(), Date.now());
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [k, v] of recentRequests.entries()) {
    if (v < cutoff) recentRequests.delete(k);
  }
}

function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

const GENERIC_SUCCESS =
  "If the details provided are correct, further instructions will be sent.";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const parsed = z.object({ email: z.string() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: true, message: GENERIC_SUCCESS });
  }

  const emailResult = parseEmail(parsed.data.email);
  const email = emailResult.ok ? emailResult.email : parsed.data.email.trim().toLowerCase();

  if (isRateLimited(email)) {
    return NextResponse.json({ success: true, message: GENERIC_SUCCESS });
  }

  recordRequest(email);

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    return NextResponse.json({ success: true, message: GENERIC_SUCCESS, resetToken: randomUUID() });
  }

  const otp = generateOtp();
  const resetToken = randomUUID();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordResetOtp.deleteMany({ where: { email } });
  await prisma.passwordResetOtp.create({
    data: { email, otp, resetToken, expiresAt, attemptCount: 0 }
  });

  const { error } = await sendEmail({
    to: email,
    subject: "GRWTEE Admin: Password reset code",
    html: `
      <p>Your one-time password reset code is:</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:4px;margin:16px 0;">${otp}</p>
      <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
    `,
    text: `Your one-time password reset code is: ${otp}. This code expires in ${OTP_EXPIRY_MINUTES} minutes.`
  });

  if (error) {
    safeError("[ForgotPassword] Send OTP failed", error);
    return NextResponse.json({ success: true, message: GENERIC_SUCCESS });
  }

  return NextResponse.json({
    success: true,
    message: GENERIC_SUCCESS,
    resetToken
  });
}
