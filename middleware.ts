export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/admin/dashboard/:path*",
    "/admin/gallery/:path*",
    "/admin/services/:path*",
    "/admin/bookings/:path*",
    "/admin/settings/:path*"
  ]
};


