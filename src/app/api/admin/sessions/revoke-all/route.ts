import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { invalidateAdminSessions } from "@/lib/auth";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return jsonUnauthorized();
  }

  await invalidateAdminSessions(session.user.id);

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: session.user.id,
    action: "admin.sessions.revoke_all",
    resource: "admin",
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return NextResponse.json({
    success: true,
    message: "All sessions revoked. Please sign in again."
  });
}
