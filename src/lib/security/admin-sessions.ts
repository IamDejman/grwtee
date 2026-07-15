import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function createAdminSession(input: {
  adminId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<string | undefined> {
  const jti = randomUUID();
  try {
    await prisma.adminSession.create({
      data: {
        adminId: input.adminId,
        jti,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS)
      }
    });
    return jti;
  } catch (err) {
    console.error("[AdminSession] create failed (migration pending?):", err);
    return undefined;
  }
}

export async function isAdminSessionActive(jti: string | undefined): Promise<boolean> {
  // Fail closed: a token without a session id, or a failed lookup, is not
  // treated as an active session.
  if (!jti) return false;
  try {
    const session = await prisma.adminSession.findUnique({ where: { jti } });
    if (!session) return false;
    if (session.revokedAt) return false;
    if (session.expiresAt < new Date()) return false;
    return true;
  } catch (err) {
    console.error("[AdminSession] lookup failed:", err);
    return false;
  }
}

export async function revokeAdminSession(jti: string): Promise<void> {
  await prisma.adminSession.updateMany({
    where: { jti, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function revokeAllAdminSessions(adminId: string): Promise<void> {
  await prisma.adminSession.updateMany({
    where: { adminId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function listAdminSessions(adminId: string) {
  return prisma.adminSession.findMany({
    where: { adminId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      jti: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true
    }
  });
}
