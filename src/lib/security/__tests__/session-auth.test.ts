/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { POST as setUpMfa } from "@/app/api/admin/mfa/route";
import { prisma } from "@/lib/prisma";
import { isAdminSessionActive } from "@/lib/security/admin-sessions";
import { writeAuditLog } from "@/lib/security/audit-log";
import { verifyTotpCodeOnce } from "@/lib/security/mfa";
import { requireAdminFromRequest, requireAdminSession } from "@/lib/security/session-auth";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));
// The real module loads otplib, which Jest can't parse.
jest.mock("@/lib/auth", () => ({ getAuthOptions: jest.fn(async () => ({})), adminMfaRequired: () => true }));
jest.mock("@/lib/prisma", () => ({ prisma: { admin: { findUnique: jest.fn(), update: jest.fn() } } }));
jest.mock("@/lib/security/admin-sessions", () => ({ isAdminSessionActive: jest.fn() }));
jest.mock("@/lib/security/step-up", () => ({ requireStepUp: jest.fn(async () => ({ ok: true })) }));
jest.mock("@/lib/security/mfa", () => ({
  encryptTotpSecret: jest.fn(() => "encrypted-new"),
  generateTotpSecret: jest.fn(),
  getTotpUri: jest.fn(),
  verifyTotpCode: jest.fn(() => true),
  verifyTotpCodeOnce: jest.fn(async () => true),
  decryptTotpSecret: jest.fn(() => "CURRENTSECRET")
}));
jest.mock("@/lib/security/audit-log", () => ({
  writeAuditLog: jest.fn(),
  requestMeta: () => ({ ip: null, userAgent: null })
}));
jest.mock("qrcode", () => ({ toDataURL: jest.fn() }));

const session = getServerSession as jest.Mock;
const token = getToken as jest.Mock;
const findAdmin = prisma.admin.findUnique as jest.Mock;
const request = () => new NextRequest("https://grwtee.com/api/admin/invoices");

beforeEach(() => {
  jest.clearAllMocks();
  session.mockResolvedValue({ user: { id: "admin-1", email: "book@grwtee.com", mustChangePassword: false } });
  (isAdminSessionActive as jest.Mock).mockResolvedValue(true);
});

describe("requireAdminSession (WEB-15)", () => {
  it("lets a signed-in admin through", async () => {
    expect(await requireAdminSession()).toMatchObject({ user: { id: "admin-1" } });
  });

  it("refuses everything but the password change while a temporary password is in use", async () => {
    session.mockResolvedValue({ user: { id: "admin-1", email: "book@grwtee.com", mustChangePassword: true } });
    expect(await requireAdminSession()).toBeNull();
  });

  it("refuses a session without an admin id", async () => {
    session.mockResolvedValue({ user: { email: "book@grwtee.com" } });
    expect(await requireAdminSession()).toBeNull();
  });
});

describe("requireAdminFromRequest (WEB-15)", () => {
  const claims = { id: "admin-1", email: "book@grwtee.com", name: "Tee", tokenVersion: 3, sessionJti: "jti-1" };

  beforeEach(() => {
    token.mockResolvedValue(claims);
    findAdmin.mockResolvedValue({ tokenVersion: 3, mustChangePassword: false });
  });

  it("accepts a live session", async () => {
    expect(await requireAdminFromRequest(request())).toEqual({ id: "admin-1", email: "book@grwtee.com", name: "Tee" });
  });

  it("refuses a token made before the version and session checks", async () => {
    token.mockResolvedValue({ id: "admin-1", email: "book@grwtee.com" });
    expect(await requireAdminFromRequest(request())).toBeNull();
    expect(findAdmin).not.toHaveBeenCalled();
  });

  it("refuses after a password change, sign-out or temporary password", async () => {
    findAdmin.mockResolvedValue({ tokenVersion: 4, mustChangePassword: false });
    expect(await requireAdminFromRequest(request())).toBeNull();

    findAdmin.mockResolvedValue({ tokenVersion: 3, mustChangePassword: true });
    expect(await requireAdminFromRequest(request())).toBeNull();

    findAdmin.mockResolvedValue({ tokenVersion: 3, mustChangePassword: false });
    (isAdminSessionActive as jest.Mock).mockResolvedValue(false);
    expect(await requireAdminFromRequest(request())).toBeNull();
  });
});

describe("POST /api/admin/mfa", () => {
  const setUp = (body: Record<string, unknown>) =>
    setUpMfa(
      new Request("https://grwtee.com/api/admin/mfa", {
        method: "POST",
        body: JSON.stringify({ secret: "NEWSECRETNEWSECRET", code: "123456", currentPassword: "pw", ...body })
      })
    );

  it("turns on two-step sign-in the first time with the new code", async () => {
    findAdmin.mockResolvedValue({ id: "admin-1", email: "book@grwtee.com", mfaEnabled: false, mfaSecret: null });
    const res = await setUp({});
    expect(res.status).toBe(200);
    expect(prisma.admin.update).toHaveBeenCalledWith({
      where: { id: "admin-1" },
      data: { mfaEnabled: true, mfaSecret: "encrypted-new" }
    });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "admin.mfa.enabled" }));
  });

  it("needs a code from the current app to move to a new phone (WEB-15)", async () => {
    findAdmin.mockResolvedValue({ id: "admin-1", email: "book@grwtee.com", mfaEnabled: true, mfaSecret: "encrypted-old", mfaLastTimeStep: null });

    const withoutCode = await setUp({});
    expect(withoutCode.status).toBe(400);
    expect(prisma.admin.update).not.toHaveBeenCalled();

    (verifyTotpCodeOnce as jest.Mock).mockResolvedValueOnce(false);
    expect((await setUp({ currentCode: "000000" })).status).toBe(400);
    expect(prisma.admin.update).not.toHaveBeenCalled();

    const moved = await setUp({ currentCode: "654321" });
    expect(moved.status).toBe(200);
    expect(verifyTotpCodeOnce).toHaveBeenLastCalledWith("admin-1", "CURRENTSECRET", "654321", null);
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "admin.mfa.replaced" }));
  });
});
