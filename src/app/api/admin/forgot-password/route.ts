import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";

const schema = z.object({
  email: z.string().email()
});

const OTP_EXPIRY_MINUTES = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 min
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
  // Prune old entries
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [k, v] of recentRequests.entries()) {
    if (v < cutoff) recentRequests.delete(k);
  }
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (isRateLimited(email)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again in 15 minutes." },
      { status: 429 }
    );
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    // Don't reveal whether email exists; still consume rate limit
    recordRequest(email);
    return NextResponse.json({ success: true, message: "If that email is registered, you will receive an OTP." });
  }

  recordRequest(email);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordResetOtp.deleteMany({ where: { email } });
  await prisma.passwordResetOtp.create({
    data: { email, otp, expiresAt }
  });

  const { error } = await sendEmail({
    to: email,
    subject: "GRWTEE Admin — Password reset code",
    html: `
      <p>Your one-time password reset code is:</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:4px;margin:16px 0;">${otp}</p>
      <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
    `,
    text: `Your one-time password reset code is: ${otp}. This code expires in ${OTP_EXPIRY_MINUTES} minutes.`
  });

  if (error) {
    console.error("[ForgotPassword] Send OTP failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send email. Try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "If that email is registered, you will receive an OTP shortly."
  });
}
