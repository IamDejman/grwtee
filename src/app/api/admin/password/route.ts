import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { getAuthOptions, invalidateAdminSessions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/security/password-hash";
import { passwordPolicySchema } from "@/lib/security/password-policy";
import { jsonGenericServerError, jsonUnauthorized } from "@/lib/security/api-response";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";
import { assertSessionIdentity } from "@/lib/security/session-auth";

const schema = z
  .object({
    email: z.string().email().optional(),
    currentPassword: z.string().min(1),
    newPassword: passwordPolicySchema,
    confirmNewPassword: passwordPolicySchema
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New password and confirm password do not match.",
    path: ["confirmNewPassword"]
  });

export async function PUT(req: Request) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email || !session.user.id) {
    return jsonUnauthorized();
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  if (!assertSessionIdentity(session.user.email, parsed.data.email)) {
    return jsonUnauthorized();
  }

  const admin = await prisma.admin.findUnique({ where: { email: session.user.email } });
  if (!admin) {
    return jsonUnauthorized();
  }

  const ok = await verifyPassword(parsed.data.currentPassword, admin.password);
  if (!ok) {
    return NextResponse.json({ success: false, error: "Invalid current password" }, { status: 400 });
  }

  const hashed = await hashPassword(parsed.data.newPassword);
  await invalidateAdminSessions(admin.id);
  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      password: hashed,
      mustChangePassword: false
    }
  });

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: admin.id,
    action: "admin.password.change",
    resource: "admin",
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return NextResponse.json({
    success: true,
    message: "Password updated. Please sign in again on all devices."
  });
}
