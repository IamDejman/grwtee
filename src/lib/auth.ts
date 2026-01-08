import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import bcrypt from "bcrypt";

type RateLimitState = { count: number; firstAttempt: number };
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 6;
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

// Initialize auth options with config from DB or env
// For NEXTAUTH_SECRET, we'll read from DB but fallback to env for initial setup
async function initAuthOptions(): Promise<NextAuthOptions> {
  const secret = await getConfig("NEXTAUTH_SECRET", process.env.NEXTAUTH_SECRET);
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET must be set in database (key: env_NEXTAUTH_SECRET) or environment variables");
  }

  return {
    session: {
      strategy: "jwt",
      maxAge: 60 * 60 * 24 // 24h
    },
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "text" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials, req) {
          if (!credentials?.email || !credentials?.password) return null;
          const key = `${credentials.email.toLowerCase()}::${req?.headers?.["x-forwarded-for"] || "unknown"}`;
          if (isRateLimited(key)) return null;

          const admin = await prisma.admin.findUnique({
            where: { email: credentials.email }
          });
          if (!admin) {
            bumpAttempt(key);
            return null;
          }
          const valid = await bcrypt.compare(credentials.password, admin.password);
          if (!valid) {
            bumpAttempt(key);
            return null;
          }
          return { id: admin.id, email: admin.email, name: admin.name };
        }
      })
    ],
    pages: {
      signIn: "/admin/login"
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = (user as any).id;
          token.email = user.email;
          token.name = user.name;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string;
        }
        return session;
      }
    },
    secret
  };
}

// Cache the auth options
let authOptionsCache: NextAuthOptions | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const now = Date.now();
  if (!authOptionsCache || now - cacheTimestamp > CACHE_TTL) {
    authOptionsCache = await initAuthOptions();
    cacheTimestamp = now;
  }
  return authOptionsCache;
}

// For synchronous access (used by NextAuth route handler)
// This will use env var as fallback during initial load
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        const key = `${credentials.email.toLowerCase()}::${req?.headers?.["x-forwarded-for"] || "unknown"}`;
        if (isRateLimited(key)) return null;

        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email }
        });
        if (!admin) {
          bumpAttempt(key);
          return null;
        }
        const valid = await bcrypt.compare(credentials.password, admin.password);
        if (!valid) {
          bumpAttempt(key);
          return null;
        }
        return { id: admin.id, email: admin.email, name: admin.name };
      }
    })
  ],
  pages: {
    signIn: "/admin/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  // Use env var as fallback, but will be overridden by getAuthOptions() in route handler
  secret: process.env.NEXTAUTH_SECRET || "temp-secret-change-in-db"
};

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }
}


