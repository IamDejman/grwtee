import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getAuthOptions } from "@/lib/auth";
import { isAdminSessionActive } from "@/lib/security/admin-sessions";
import { prisma } from "@/lib/prisma";

/**
 * The signed-in admin's live session (the NextAuth callback checks the
 * token version and session record), even while a temporary password
 * still has to be changed. Only for the screens and routes that change it.
 */
export async function getAdminSession() {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email || !session.user.id) return null;
  return session;
}

/** Every admin route: a live session, with no temporary password left to change (WEB-15). */
export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session || session.user.mustChangePassword) return null;
  return session;
}

/**
 * The same checks from the request's token, for routes that read it
 * directly. Every claim must be there: a token without its version or
 * session id is older than those checks or wasn't made by this site
 * (WEB-15).
 */
export async function requireAdminFromRequest(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email || !token?.id) return null;
  if (typeof token.tokenVersion !== "number" || typeof token.sessionJti !== "string") return null;

  // A login lock only stops new sign-ins; it doesn't end live sessions.
  const admin = await prisma.admin.findUnique({
    where: { id: token.id as string },
    select: { tokenVersion: true, mustChangePassword: true }
  });
  if (!admin || admin.tokenVersion !== token.tokenVersion) return null;
  if (admin.mustChangePassword) return null;
  if (!(await isAdminSessionActive(token.sessionJti))) return null;

  return {
    id: token.id as string,
    email: token.email as string,
    name: (token.name as string | null) ?? null
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
