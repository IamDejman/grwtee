import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

// Cache the NextAuth handler instance
let cachedHandler: ReturnType<typeof NextAuth> | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getHandler() {
  const now = Date.now();
  if (!cachedHandler || now - cacheTime > CACHE_TTL) {
    const options = await getAuthOptions();
    cachedHandler = NextAuth(options);
    cacheTime = now;
  }
  return cachedHandler;
}

// Create async handlers that use DB-backed config
export async function GET(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  const handler = await getHandler();
  return handler(req as any, context as any);
}

export async function POST(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  const handler = await getHandler();
  return handler(req as any, context as any);
}


