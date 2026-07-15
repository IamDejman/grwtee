import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { listAdminSessions } from "@/lib/security/admin-sessions";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return jsonUnauthorized();
  }

  const sessions = await listAdminSessions(session.user.id);
  const token = await getToken({ req: req as never, secret: process.env.NEXTAUTH_SECRET });
  const currentJti = token?.sessionJti as string | undefined;

  return NextResponse.json({
    success: true,
    data: sessions.map((row) => ({
      ...row,
      current: row.jti === currentJti
    }))
  });
}
