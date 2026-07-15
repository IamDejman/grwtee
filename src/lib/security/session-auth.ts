import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getAuthOptions } from "@/lib/auth";
import { isAdminSessionActive } from "@/lib/security/admin-sessions";
import { prisma } from "@/lib/prisma";

export async function requireAdminSession() {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email || !session.user.id) return null;
  return session;
}

export async function requireAdminFromRequest(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || !token?.id) return null;

  if (typeof token.tokenVersion === "number") {
    const admin = await prisma.admin.findUnique({
      where: { id: token.id as string },
      select: { tokenVersion: true, lockedUntil: true }
    });
    if (!admin || admin.tokenVersion !== token.tokenVersion) return null;
    if (admin.lockedUntil && admin.lockedUntil > new Date()) return null;
  }

  if (typeof token.sessionJti === "string") {
    if (!(await isAdminSessionActive(token.sessionJti))) return null;
  }

  return {
    id: token.id as string,
    email: token.email as string,
    name: (token.name as string | null) ?? null,
    mustChangePassword: Boolean(token.mustChangePassword)
  };
}

/** Reject when a caller-supplied identifier does not match the active session. */
export function assertSessionIdentity(
  sessionEmail: string,
  requestedEmail: string | undefined | null
): boolean {
  if (!requestedEmail) return true;
  return sessionEmail.toLowerCase() === requestedEmail.trim().toLowerCase();
}
