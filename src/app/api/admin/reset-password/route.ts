import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8)
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, otp, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { success: false, error: "New password and confirm password do not match." },
      { status: 400 }
    );
  }

  const emailLower = email.trim().toLowerCase();

  const row = await prisma.passwordResetOtp.findFirst({
    where: { email: emailLower },
    orderBy: { createdAt: "desc" }
  });

  if (!row || row.otp !== otp) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired code. Request a new one." },
      { status: 400 }
    );
  }

  if (new Date() > row.expiresAt) {
    await prisma.passwordResetOtp.deleteMany({ where: { email: emailLower } });
    return NextResponse.json(
      { success: false, error: "Code has expired. Request a new one." },
      { status: 400 }
    );
  }

  const admin = await prisma.admin.findUnique({ where: { email: emailLower } });
  if (!admin) {
    await prisma.passwordResetOtp.deleteMany({ where: { email: emailLower } });
    return NextResponse.json({ success: false, error: "Account not found." }, { status: 404 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { password: hashed }
  });
  await prisma.passwordResetOtp.deleteMany({ where: { email: emailLower } });

  return NextResponse.json({ success: true, message: "Password updated. You can sign in now." });
}
