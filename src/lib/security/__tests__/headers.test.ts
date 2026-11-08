/**
 * @jest-environment node
 */
import { applySecurityHeaders, SECURITY_HEADERS, supabaseOrigins } from "../headers";

// The policy every page had before admin pages could reach Supabase (copied from the live site).
const PUBLIC_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://www.grwtee.com https://grwtee.com https://www.googletagmanager.com https://*.google-analytics.com; connect-src 'self' https://res.cloudinary.com https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

const directives = (csp: string | null) => new Map((csp ?? "").split("; ").map((d) => [d.split(" ")[0], d] as const));
const cspOf = (supabase?: boolean) => applySecurityHeaders(new Response(), { supabase }).headers.get("Content-Security-Policy");

describe("supabaseOrigins", () => {
  it("gives the project's https origin and its Realtime wss origin", () => {
    expect(supabaseOrigins("https://abcdefghijklmnopqrst.supabase.co")).toEqual([
      "https://abcdefghijklmnopqrst.supabase.co",
      "wss://abcdefghijklmnopqrst.supabase.co"
    ]);
    expect(supabaseOrigins("https://abcdefghijklmnopqrst.supabase.co/")).toEqual([
      "https://abcdefghijklmnopqrst.supabase.co",
      "wss://abcdefghijklmnopqrst.supabase.co"
    ]);
  });

  it("uses ws for a local http Supabase", () => {
    expect(supabaseOrigins("http://localhost:54321")).toEqual(["http://localhost:54321", "ws://localhost:54321"]);
  });

  it("adds nothing when the URL is missing or isn't http(s)", () => {
    expect(supabaseOrigins(undefined)).toEqual([]);
    expect(supabaseOrigins("")).toEqual([]);
    expect(supabaseOrigins("not a url")).toEqual([]);
    expect(supabaseOrigins("ftp://abcdefghijklmnopqrst.supabase.co")).toEqual([]);
  });
});

describe("applySecurityHeaders", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("keeps the public policy exactly as it was", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co";
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toBe(PUBLIC_CSP);
    expect(cspOf()).toBe(PUBLIC_CSP);
  });

  it("lets admin pages connect to and show images from this project's Supabase, and changes nothing else", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co";
    const admin = directives(cspOf(true));
    const pub = directives(PUBLIC_CSP);
    expect(admin.get("connect-src")).toBe(
      `${pub.get("connect-src")} https://abcdefghijklmnopqrst.supabase.co wss://abcdefghijklmnopqrst.supabase.co`
    );
    expect(admin.get("img-src")).toBe(`${pub.get("img-src")} https://abcdefghijklmnopqrst.supabase.co`);
    for (const [name, value] of pub) {
      if (name !== "connect-src" && name !== "img-src") expect(admin.get(name)).toBe(value);
    }
    expect(admin.size).toBe(pub.size);
  });

  it("adds nothing for admin pages when the Supabase URL isn't set", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(cspOf(true)).toBe(PUBLIC_CSP);
  });

  it("still sets the other headers and drops X-Powered-By", () => {
    const res = new Response(null, { headers: { "X-Powered-By": "Next.js" } });
    applySecurityHeaders(res, { supabase: true });
    expect(res.headers.get("X-Powered-By")).toBeNull();
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Strict-Transport-Security")).toBe(SECURITY_HEADERS["Strict-Transport-Security"]);
  });
});
