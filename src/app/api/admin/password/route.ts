import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";

const schema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
    confirmNewPassword: z.string().min(8)
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New password and confirm password do not match.",
    path: ["confirmNewPassword"]
  });

export async function PUT(req: Request) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { email: session.user.email } });
  if (!admin) {
    return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 });
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, admin.password);
  if (!ok) {
    return NextResponse.json({ success: false, error: "Invalid current password" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.admin.update({ where: { id: admin.id }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}


