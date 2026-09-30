import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { listAdminSessions } from "@/lib/security/admin-sessions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return jsonUnauthorized();
  }

  const [sessions, token, admin] = await Promise.all([
    listAdminSessions(session.user.id),
    getToken({ req: req as never, secret: process.env.NEXTAUTH_SECRET }),
    prisma.admin.findUnique({ where: { id: session.user.id }, select: { mfaEnabled: true } })
  ]);
  const currentJti = token?.sessionJti as string | undefined;

  return NextResponse.json({
    success: true,
    // Lets the Account settings tab show whether two-step sign-in is on without starting a new setup.
    mfaEnabled: admin?.mfaEnabled ?? false,
    // The session id (jti) stays on the server; the page only needs to know which row is this device.
    data: sessions.map(({ jti, ...row }) => ({
      ...row,
      current: jti === currentJti
    }))
  });
}
