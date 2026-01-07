import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
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

export const authOptions: NextAuthOptions = {
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
  secret: process.env.NEXTAUTH_SECRET
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


