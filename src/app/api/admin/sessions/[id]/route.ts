import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { listAdminSessions, revokeAdminSession } from "@/lib/security/admin-sessions";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return jsonUnauthorized();
  }

  const { id } = await params;
  const sessions = await listAdminSessions(session.user.id);
  const target = sessions.find((row) => row.id === id);
  if (!target) {
    return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
  }

  await revokeAdminSession(target.jti);
  return NextResponse.json({ success: true });
}
