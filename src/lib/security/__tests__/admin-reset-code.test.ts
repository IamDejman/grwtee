/**
 * @jest-environment node
 */
import { POST as resetPassword } from "@/app/api/admin/reset-password/route";
import { POST as forgotPassword } from "@/app/api/admin/forgot-password/route";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { invalidateAdminSessions } from "@/lib/auth";
import { hashResetCode } from "@/lib/security/reset-code";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetOtp: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn()
    },
    admin: { findUnique: jest.fn(), update: jest.fn() }
  }
}));
jest.mock("@/lib/resend", () => ({ sendEmail: jest.fn() }));
jest.mock("@/lib/auth", () => ({ invalidateAdminSessions: jest.fn() }));
jest.mock("@/lib/security/password-hash", () => ({ hashPassword: jest.fn(async () => "new-hash") }));
jest.mock("@/lib/security/security-events", () => ({ writeSecurityEvent: jest.fn() }));
jest.mock("@/lib/security/audit-log", () => ({
  writeAuditLog: jest.fn(),
  requestMeta: () => ({ ip: null, userAgent: null })
}));

const otpRows = prisma.passwordResetOtp as unknown as Record<string, jest.Mock>;
const admins = prisma.admin as unknown as Record<string, jest.Mock>;

const RESET_TOKEN = "7d9f5c62-3b1e-4c8a-9f0d-2a6b8e4c1d37";
const NEW_PASSWORD = "Correct-Horse-Battery-9";

function resetRequest(otp: string) {
  return new Request("https://grwtee.com/api/admin/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email: "book@grwtee.test",
      resetToken: RESET_TOKEN,
      otp,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    })
  });
}

function codeRow(storedOtp: string, attemptCount: number) {
  return {
    id: "otp-1",
    email: "book@grwtee.test",
    otp: storedOtp,
    resetToken: RESET_TOKEN,
    attemptCount,
    expiresAt: new Date(Date.now() + 5 * 60_000),
    createdAt: new Date()
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXTAUTH_SECRET = "test-secret";
});

describe("admin reset-password", () => {
  it("counts a wrong guess with a conditional update before comparing", async () => {
    otpRows.findFirst.mockResolvedValue(codeRow(hashResetCode("654321"), 2));
    otpRows.updateMany.mockResolvedValue({ count: 1 });

    const res = await resetPassword(resetRequest("123456"));

    expect(res.status).toBe(400);
    expect(otpRows.updateMany).toHaveBeenCalledWith({
      where: { id: "otp-1", attemptCount: 2 },
      data: { attemptCount: { increment: 1 } }
    });
    expect(admins.update).not.toHaveBeenCalled();
  });

  it("refuses a guess that lost the race for its attempt, even with the right code", async () => {
    otpRows.findFirst.mockResolvedValue(codeRow(hashResetCode("123456"), 0));
    otpRows.updateMany.mockResolvedValue({ count: 0 });

    const res = await resetPassword(resetRequest("123456"));

    expect(res.status).toBe(400);
    expect(admins.update).not.toHaveBeenCalled();
  });

  it("resets the password with the right code and ends every session", async () => {
    otpRows.findFirst.mockResolvedValue(codeRow(hashResetCode("123456"), 1));
    otpRows.updateMany.mockResolvedValue({ count: 1 });
    admins.findUnique.mockResolvedValue({ id: "admin-1" });

    const res = await resetPassword(resetRequest("123456"));

    expect(res.status).toBe(200);
    expect(invalidateAdminSessions).toHaveBeenCalledWith("admin-1");
    expect(admins.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { password: "new-hash", mustChangePassword: false } })
    );
  });

  it("keeps a used-up code, so it still counts toward the issuing limit", async () => {
    otpRows.findFirst.mockResolvedValue(codeRow(hashResetCode("123456"), 5));

    const res = await resetPassword(resetRequest("123456"));

    expect(res.status).toBe(400);
    expect(otpRows.updateMany).not.toHaveBeenCalled();
    expect(otpRows.deleteMany).not.toHaveBeenCalled();
  });

  it("no longer accepts a code stored in plain text", async () => {
    otpRows.findFirst.mockResolvedValue(codeRow("123456", 0));
    otpRows.updateMany.mockResolvedValue({ count: 1 });

    const res = await resetPassword(resetRequest("123456"));

    expect(res.status).toBe(400);
    expect(admins.update).not.toHaveBeenCalled();
  });
});

describe("admin forgot-password", () => {
  const forgotRequest = (email: string) =>
    new Request("https://grwtee.com/api/admin/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email })
    });

  it("stores only a hash of the emailed code", async () => {
    otpRows.findFirst.mockResolvedValue(null);
    admins.findUnique.mockResolvedValue({ id: "admin-1" });
    (sendEmail as jest.Mock).mockResolvedValue({ error: null });

    const res = await forgotPassword(forgotRequest("issue@grwtee.test"));

    expect(res.status).toBe(200);
    const stored = otpRows.create.mock.calls[0][0].data.otp as string;
    const emailed = ((sendEmail as jest.Mock).mock.calls[0][0].text as string).match(/\d{6}/)![0];
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toContain(emailed);
    expect(stored).toBe(hashResetCode(emailed));
  });

  it("issues no new code while one from the last 15 minutes exists", async () => {
    otpRows.findFirst.mockResolvedValue({ id: "otp-recent" });

    const res = await forgotPassword(forgotRequest("limited@grwtee.test"));
    const json = await res.json();

    expect(res.status).toBe(200);
    // Same shape as a real send, so the response doesn't reveal the limit.
    expect(json.resetToken).toEqual(expect.any(String));
    expect(otpRows.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
