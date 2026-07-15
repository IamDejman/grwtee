import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/security/logger";

type SecurityEventInput = {
  category: string;
  action: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

export async function writeSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        category: input.category,
        action: input.action,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ip: input.ip ?? null
      }
    });
    safeLog("[SecurityEvent]", {
      category: input.category,
      action: input.action
    });
  } catch (error) {
    console.error("[SecurityEvent] Failed to persist", error);
  }
}
