import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/security/logger";

type AuditInput = {
  adminId: string;
  action: string;
  resource?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        resource: input.resource,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null
      }
    });
    safeLog("[Audit]", {
      action: input.action,
      resource: input.resource,
      adminId: input.adminId
    });
  } catch (error) {
    console.error("[Audit] Failed to write log", error);
  }
}

export function requestMeta(req: Request): { ip: string | null; userAgent: string | null } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  return { ip, userAgent: req.headers.get("user-agent") };
}
