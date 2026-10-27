import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/security/password-hash";
import { writeAuditLog } from "@/lib/security/audit-log";
import { decryptTotpSecret, verifyTotpCodeOnce } from "@/lib/security/mfa";
import {
  createAdminSession,
  isAdminSessionActive,
  revokeAdminSession,
  revokeAllAdminSessions
} from "@/lib/security/admin-sessions";
import { writeSecurityEvent } from "@/lib/security/security-events";
import { consumeRateLimit, isRateLimited, resetRateLimit } from "@/lib/security/rate-limit";

// Failed sign-ins per email and IP, kept in the database so the limit holds
// across server instances.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 6;
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
// Wrong authenticator codes per account, from any IP. Codes are only checked
// after the right password, so only someone who has it can use these up.
const MFA_FAILURE_MAX = 5;
const MFA_FAILURE_WINDOW_MS = 15 * 60 * 1000;

const loginKey = (key: string) => `admin-login:${key}`;
const mfaKey = (adminId: string) => `admin-mfa:${adminId}`;

function bumpAttempt(key: string) {
  return consumeRateLimit(loginKey(key), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
}

/** Whether every admin must turn on two-step sign-in (on unless set to "false"). */
export function adminMfaRequired(): boolean {
  return process.env.ADMIN_REQUIRE_MFA !== "false";
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
  if (await isRateLimited(loginKey(key), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    return { ok: false, error: "rate_limited" };
  }

  let admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    await bumpAttempt(key);
    await sleep(progressiveDelayMs(1));
    return { ok: false, error: "invalid_credentials" };
  }

  // Clear a lock that has run out, counter included. Otherwise the counter
  // stays at the limit and a single wrong password locks the account again.
  if (admin.lockedUntil && admin.lockedUntil <= new Date()) {
    admin = await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });
  }

  // While locked, only a full sign-in (password and authenticator code) gets
  // through, so someone who only knows the email can't keep the admin out.
  // Every failure gets the same answer and doesn't extend the lock. Without
  // MFA the lock holds regardless: a password on its own could be guessed.
  const locked = Boolean(admin.lockedUntil && admin.lockedUntil > new Date());
  if (locked && !admin.mfaEnabled) {
    await bumpAttempt(key);
    return { ok: false, error: "account_locked" };
  }

  const valid = await verifyPassword(credentials.password, admin.password);
  if (!valid) {
    await bumpAttempt(key);
    if (locked) {
      return { ok: false, error: "account_locked" };
    }
    await recordFailedLogin(admin.id, ip);
    await sleep(progressiveDelayMs(admin.failedLoginAttempts));
    return { ok: false, error: "invalid_credentials" };
  }

  if (admin.mfaEnabled) {
    const secret = decryptTotpSecret(admin.mfaSecret);
    const code = credentials.totp?.trim();
    if (!code) {
      return { ok: false, error: locked ? "account_locked" : "mfa_required" };
    }
    if (await isRateLimited(mfaKey(admin.id), MFA_FAILURE_MAX, MFA_FAILURE_WINDOW_MS)) {
      return { ok: false, error: "rate_limited" };
    }
    // A code is accepted once: replaying one seen on the way in fails.
    const accepted = secret ? await verifyTotpCodeOnce(admin.id, secret, code, admin.mfaLastTimeStep) : false;
    if (!accepted) {
      await bumpAttempt(key);
      await consumeRateLimit(mfaKey(admin.id), MFA_FAILURE_MAX, MFA_FAILURE_WINDOW_MS);
      await writeSecurityEvent({
        category: "auth",
        action: "admin.mfa.failed",
        metadata: { adminId: admin.id },
        ip
      });
      return { ok: false, error: locked ? "account_locked" : "mfa_invalid" };
    }
    await resetRateLimit(mfaKey(admin.id));
  }

  await resetRateLimit(loginKey(key));
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
    mfaSetupRequired: adminMfaRequired() && !admin.mfaEnabled,
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
    events: {
      // Signing out ends the session record too, so a copy of the cookie
      // stops working straight away instead of when it expires.
      async signOut({ token }) {
        if (typeof token?.sessionJti === "string") {
          await revokeAdminSession(token.sessionJti);
        }
      }
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = (user as { id: string }).id;
          token.email = user.email;
          token.name = user.name;
          token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0;
          token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false;
          token.mfaSetupRequired = (user as { mfaSetupRequired?: boolean }).mfaSetupRequired ?? false;
          token.sessionJti = (user as { sessionJti?: string }).sessionJti;
          return token;
        }

        if (token.id) {
          // A login lock only stops new sign-ins. Ending live sessions here
          // would let anyone who knows the email sign the admin out.
          const admin = await prisma.admin.findUnique({
            where: { id: token.id as string },
            select: { tokenVersion: true, mustChangePassword: true, mfaEnabled: true }
          });
          if (!admin || admin.tokenVersion !== token.tokenVersion) {
            return {};
          }

          if (!token.sessionJti) {
            const jti = await createAdminSession({ adminId: token.id as string });
            if (jti) token.sessionJti = jti;
          } else if (!(await isAdminSessionActive(token.sessionJti as string))) {
            return {};
          }

          token.mustChangePassword = admin.mustChangePassword;
          token.mfaSetupRequired = adminMfaRequired() && !admin.mfaEnabled;
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
  // Environment only, like the middleware and the API session checks: a
  // different value saved anywhere else would make every session invalid.
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET must be set in the environment variables");
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
    mfaSetupRequired?: boolean;
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
    mfaSetupRequired?: boolean;
    sessionJti?: string;
  }
}
