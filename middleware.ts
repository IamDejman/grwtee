import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { applySecurityHeaders } from "@/lib/security/headers";

const adminProtected = [
  "/admin/dashboard",
  "/admin/gallery",
  "/admin/services",
  "/admin/bookings",
  "/admin/invoices",
  "/admin/settings",
  "/admin/mailing-list",
  "/admin/waitlist",
  "/admin/looks",
  "/admin/lookbooks",
  "/admin/calendar",
  "/admin/clients",
  "/admin/messages"
];

const adminPublicPaths = ["/admin/login", "/admin/forgot-password"];

const adminApiPrefixes = [
  "/api/admin",
  "/api/payment-accounts",
  "/api/invoices",
  "/api/settings",
  "/api/upload",
  "/api/gallery",
  "/api/bookings",
  "/api/stylist"
];

function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function isAdminIpAllowed(request: NextRequest): boolean {
  const allowlist = process.env.ADMIN_ALLOWED_IPS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowlist?.length) return true;

  const ip = getClientIp(request);
  return Boolean(ip && allowlist.includes(ip));
}

function requiresAdminIpGuard(pathname: string): boolean {
  if (adminPublicPaths.some((p) => pathname.startsWith(p))) return false;
  if (pathname.startsWith("/admin")) return true;
  return adminApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  applySecurityHeaders(response);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (requiresAdminIpGuard(pathname) && !isAdminIpAllowed(request)) {
    return withSecurityHeaders(new NextResponse("Forbidden", { status: 403 }));
  }

  if (pathname.startsWith("/admin/change-password")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
    if (!token?.id) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/admin/login", request.url))
      );
    }
    return withSecurityHeaders(NextResponse.next());
  }

  if (adminProtected.some((p) => pathname.startsWith(p))) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token?.id) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("reason", "session_expired");
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    if (token.mustChangePassword && !pathname.startsWith("/admin/change-password")) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/admin/change-password", request.url))
      );
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
