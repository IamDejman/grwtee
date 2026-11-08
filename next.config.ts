import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { SECURITY_HEADERS } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "www.grwtee.com"
      },
      {
        protocol: "https",
        hostname: "grwtee.com"
      },
      {
        protocol: "http",
        hostname: "localhost"
      }
    ]
  },
  // Every response, including the static files the middleware skips.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value }))
      }
    ];
  }
};

// Browser reports go through /monitoring on this site (no new address in
// the security policy). Source maps go to Sentry only when the build has
// SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT (OPS-07).
export default withSentryConfig(nextConfig, {
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN }
});
