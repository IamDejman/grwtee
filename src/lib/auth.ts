import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/security/password-hash";
import { writeAuditLog } from "@/lib/security/audit-log";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/security/mfa";
import { createAdminSession, isAdminSessionActive, revokeAllAdminSessions } from "@/lib/security/admin-sessions";
import { writeSecurityEvent } from "@/lib/security/security-events";

type RateLimitState = { count: number; firstAttempt: number };
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 6;
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const attempts = new Map<string, RateLimitState>();

function isRateLimited(key: string) {
  const now = Date.now();
  const prev = attempts.get(key);
  if (!prev) return false;
  if (now - prev.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return prev.count >= RATE_LIMIT_MAX;
}

function bumpAttempt(key: string) {
  const now = Date.now();
  const prev = attempts.get(key);
  if (!prev || now - prev.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return;
  }
  attempts.set(key, { count: prev.count + 1, firstAttempt: prev.firstAttempt });
}

function progressiveDelayMs(failedAttempts: number): number {
  return Math.min(Math.max(failedAttempts, 0) * 500, 3000);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestIp(req?: { headers?: Record<string, string | string[] | undefined> }) {
  return (
    (typeof req?.headers?.["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : null) ?? null
  );
}

function requestUserAgent(req?: { headers?: Record<string, string | string[] | undefined> }) {
  return typeof req?.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null;
}

async function recordFailedLogin(adminId: string, ip: string | null) {
  const admin = await prisma.admin.update({
    where: { id: adminId },
    data: { failedLoginAttempts: { increment: 1 } },
    select: { failedLoginAttempts: true }
  });

  if (admin.failedLoginAttempts >= LOCKOUT_MAX_ATTEMPTS) {
    await prisma.admin.update({
      where: { id: adminId },
      data: { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) }
    });
    await writeSecurityEvent({
      category: "auth",
      action: "admin.account.locked",
      metadata: { adminId },
      ip
    });
  }
}

async function clearLoginFailures(adminId: string) {
  await prisma.admin.update({
    where: { id: adminId },
    data: { failedLoginAttempts: 0, lockedUntil: null }
  });
}

export type AdminLoginError =
  | "invalid_credentials"
  | "mfa_required"
  | "mfa_invalid"
  | "account_locked"
  | "rate_limited";

export async function validateAdminLogin(
  credentials: { email?: string; password?: string; totp?: string } | undefined,
  req?: { headers?: Record<string, string | string[] | undefined> }
): Promise<{ ok: true; adminId: string } | { ok: false; error: AdminLoginError }> {
  if (!credentials?.email || !credentials?.password) {
    return { ok: false, error: "invalid_credentials" };
  }

  const email = credentials.email.trim().toLowerCase();
  const ip = requestIp(req);
  const key = `${email}::${ip || "unknown"}`;
  if (isRateLimited(key)) {
    return { ok: false, error: "rate_limited" };
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    bumpAttempt(key);
    await sleep(progressiveDelayMs(1));
    return { ok: false, error: "invalid_credentials" };
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    bumpAttempt(key);
    return { ok: false, error: "account_locked" };
  }

  const valid = await verifyPassword(credentials.password, admin.password);
  if (!valid) {
    bumpAttempt(key);
    await recordFailedLogin(admin.id, ip);
    await sleep(progressiveDelayMs(admin.failedLoginAttempts));
    return { ok: false, error: "invalid_credentials" };
  }

  if (admin.mfaEnabled) {
    const secret = decryptTotpSecret(admin.mfaSecret);
    const code = credentials.totp?.trim();
    if (!code) {
      return { ok: false, error: "mfa_required" };
    }
    if (!secret || !verifyTotpCode(secret, code)) {
      bumpAttempt(key);
      await writeSecurityEvent({
        category: "auth",
        action: "admin.mfa.failed",
        metadata: { adminId: admin.id },
        ip
      });
      return { ok: false, error: "mfa_invalid" };
    }
  }

  return { ok: true, adminId: admin.id };
}

async function authorizeAdmin(
  credentials: { email?: string; password?: string; totp?: string } | undefined,
  req?: { headers?: Record<string, string | string[] | undefined> }
) {
  const result = await validateAdminLogin(credentials, req);
  if (!result.ok) return null;

  const email = credentials!.email!.trim().toLowerCase();
  const ip = requestIp(req);
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return null;

  if (await needsRehash(admin.password)) {
    const rehashed = await hashPassword(credentials!.password!);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: rehashed }
    });
  }

  await clearLoginFailures(admin.id);

  const userAgent = requestUserAgent(req);
  const sessionJti = await createAdminSession({
    adminId: admin.id,
    ip,
    userAgent
  });

  await writeAuditLog({
    adminId: admin.id,
    action: "admin.login.success",
    ip,
    userAgent
  });

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    tokenVersion: admin.tokenVersion,
    mustChangePassword: admin.mustChangePassword,
    sessionJti
  };
}

function buildAuthOptions(secret: string): NextAuthOptions {
  return {
    session: {
      strategy: "jwt",
      maxAge: 60 * 60 * 24
    },
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "text" },
          password: { label: "Password", type: "password" },
          totp: { label: "Authenticator code", type: "text" }
        },
        authorize: authorizeAdmin
      })
    ],
    pages: {
      signIn: "/admin/login"
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = (user as { id: string }).id;
          token.email = user.email;
          token.name = user.name;
          token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0;
          token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false;
          token.sessionJti = (user as { sessionJti?: string }).sessionJti;
          return token;
        }

        if (token.id) {
          const admin = await prisma.admin.findUnique({
            where: { id: token.id as string },
            select: { tokenVersion: true, mustChangePassword: true, lockedUntil: true }
          });
          if (!admin || admin.tokenVersion !== token.tokenVersion) {
            return {};
          }
          if (admin.lockedUntil && admin.lockedUntil > new Date()) {
            return {};
          }

          if (!token.sessionJti) {
            const jti = await createAdminSession({ adminId: token.id as string });
            if (jti) token.sessionJti = jti;
          } else if (!(await isAdminSessionActive(token.sessionJti as string))) {
            return {};
          }

          token.mustChangePassword = admin.mustChangePassword;
        }

        return token;
      },
      async session({ session, token }) {
        if (!token?.id) {
          return { ...session, user: undefined as never };
        }
        if (session.user) {
          session.user.id = token.id as string;
          session.user.mustChangePassword = Boolean(token.mustChangePassword);
        }
        return session;
      }
    },
    secret
  };
}

async function initAuthOptions(): Promise<NextAuthOptions> {
  const secret = await getConfig("NEXTAUTH_SECRET", process.env.NEXTAUTH_SECRET);
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET must be set in database (key: env_NEXTAUTH_SECRET) or environment variables"
    );
  }
  return buildAuthOptions(secret);
}

let authOptionsCache: NextAuthOptions | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const now = Date.now();
  if (!authOptionsCache || now - cacheTimestamp > CACHE_TTL) {
    authOptionsCache = await initAuthOptions();
    cacheTimestamp = now;
  }
  return authOptionsCache;
}

export const authOptions: NextAuthOptions = buildAuthOptions(
  process.env.NEXTAUTH_SECRET || "temp-secret-change-in-db"
);

export async function invalidateAdminSessions(adminId: string) {
  await revokeAllAdminSessions(adminId);
  return prisma.admin.update({
    where: { id: adminId },
    data: {
      tokenVersion: { increment: 1 },
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });
}

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string | null;
    tokenVersion?: number;
    mustChangePassword?: boolean;
    sessionJti?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      mustChangePassword?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    tokenVersion?: number;
    mustChangePassword?: boolean;
    sessionJti?: string;
  }
}
