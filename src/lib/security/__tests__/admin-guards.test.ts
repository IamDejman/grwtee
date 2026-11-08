/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifySync } from "otplib";
import { middleware } from "../../../../middleware";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/security/password-hash";
import { consumeRateLimit, isRateLimited, resetRateLimit } from "@/lib/security/rate-limit";
import { requireStepUp } from "@/lib/security/step-up";
import { verifyTotpCodeOnce } from "@/lib/security/mfa";

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));
// otplib ships ES modules Jest can't load; only verifySync matters here.
jest.mock("otplib", () => ({ verifySync: jest.fn(), generateSecret: jest.fn(), generateURI: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: { admin: { findUnique: jest.fn(), updateMany: jest.fn() } } }));
jest.mock("@/lib/security/password-hash", () => ({ verifyPassword: jest.fn() }));
jest.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: jest.fn(),
  isRateLimited: jest.fn(),
  resetRateLimit: jest.fn()
}));

const token = getToken as jest.Mock;
const env = process.env as Record<string, string | undefined>;
const ENV = { ...process.env };

const visit = (path: string, method = "GET", ip = "198.51.100.7") =>
  middleware(new NextRequest(`https://grwtee.com${path}`, { method, headers: { "x-forwarded-for": ip } }));

beforeEach(() => {
  jest.clearAllMocks();
  env.ADMIN_ALLOWED_IPS = "203.0.113.1";
  token.mockResolvedValue(null);
});

afterAll(() => {
  process.env = ENV;
});

describe("admin IP allowlist", () => {
  it.each([
    ["POST", "/api/bookings"],
    ["GET", "/api/gallery"],
    ["GET", "/admin/login"],
    ["POST", "/api/contact"]
  ])("lets the public %s %s from any IP", async (method, path) => {
    expect((await visit(path, method)).status).not.toBe(403);
  });

  it.each([
    ["GET", "/api/bookings"],
    ["PATCH", "/api/bookings/b1"],
    ["POST", "/api/gallery"],
    ["DELETE", "/api/gallery/g1"],
    ["POST", "/api/auth/callback/credentials"],
    ["GET", "/admin/dashboard"],
    ["GET", "/api/admin/broadcasts"]
  ])("keeps %s %s to the allowed IPs", async (method, path) => {
    expect((await visit(path, method)).status).toBe(403);
    expect((await visit(path, method, "203.0.113.1")).status).not.toBe(403);
  });
});

describe("two-step sign-in required", () => {
  it("sends an admin without it to the page that sets it up", async () => {
    delete env.ADMIN_ALLOWED_IPS;
    token.mockResolvedValue({ id: "admin-1", mfaSetupRequired: true });

    const res = await visit("/admin/dashboard");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://grwtee.com/admin/settings?tab=account&setup=mfa");

    expect((await visit("/admin/settings")).status).toBe(200);
  });
});

describe("password re-check for sensitive actions", () => {
  beforeEach(() => {
    (prisma.admin.findUnique as jest.Mock).mockResolvedValue({ id: "admin-1", password: "hash" });
    (isRateLimited as jest.Mock).mockResolvedValue(false);
  });

  it("counts wrong passwords per admin in the database", async () => {
    (verifyPassword as jest.Mock).mockResolvedValue(false);
    expect(await requireStepUp("Book@GRWTEE.com", "wrong")).toEqual({ ok: false, message: "Invalid current password" });
    expect(consumeRateLimit).toHaveBeenCalledWith("admin-stepup:book@grwtee.com", 5, 900_000);
  });

  it("stops checking after five wrong passwords, even the right one", async () => {
    (isRateLimited as jest.Mock).mockResolvedValue(true);
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    const result = await requireStepUp("book@grwtee.com", "right");
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/Too many wrong passwords/) });
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("clears the count after the right password", async () => {
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    expect(await requireStepUp("book@grwtee.com", "right")).toEqual({ ok: true });
    expect(resetRateLimit).toHaveBeenCalledWith("admin-stepup:book@grwtee.com");
  });
});

describe("authenticator codes work once", () => {
  const updateMany = prisma.admin.updateMany as jest.Mock;

  it("accepts a code and records its time step", async () => {
    (verifySync as jest.Mock).mockReturnValue({ valid: true, delta: 0, timeStep: 59_000_001 });
    updateMany.mockResolvedValue({ count: 1 });

    expect(await verifyTotpCodeOnce("admin-1", "secret", "123456", 59_000_000)).toBe(true);
    expect(verifySync).toHaveBeenCalledWith({ secret: "secret", token: "123456", afterTimeStep: 59_000_000 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "admin-1", OR: [{ mfaLastTimeStep: null }, { mfaLastTimeStep: { lt: 59_000_001 } }] },
      data: { mfaLastTimeStep: 59_000_001 }
    });
  });

  it("refuses the same code when another request used it first", async () => {
    (verifySync as jest.Mock).mockReturnValue({ valid: true, delta: 0, timeStep: 59_000_001 });
    updateMany.mockResolvedValue({ count: 0 });
    expect(await verifyTotpCodeOnce("admin-1", "secret", "123456", null)).toBe(false);
  });

  it("refuses a wrong or already-used code without recording anything", async () => {
    (verifySync as jest.Mock).mockReturnValue({ valid: false });
    expect(await verifyTotpCodeOnce("admin-1", "secret", "123456", 59_000_001)).toBe(false);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
