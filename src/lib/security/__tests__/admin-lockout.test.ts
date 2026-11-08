/**
 * @jest-environment node
 */
import { validateAdminLogin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/security/password-hash";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/security/mfa";

jest.mock("@/lib/prisma", () => ({
  prisma: { admin: { findUnique: jest.fn(), update: jest.fn() } }
}));
jest.mock("@/lib/security/password-hash", () => ({
  verifyPassword: jest.fn(),
  hashPassword: jest.fn(),
  needsRehash: jest.fn()
}));
jest.mock("@/lib/security/mfa", () => ({
  decryptTotpSecret: jest.fn(),
  verifyTotpCode: jest.fn()
}));
jest.mock("@/lib/security/security-events", () => ({ writeSecurityEvent: jest.fn() }));
jest.mock("@/lib/security/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/security/admin-sessions", () => ({
  createAdminSession: jest.fn(),
  isAdminSessionActive: jest.fn(),
  revokeAllAdminSessions: jest.fn()
}));
jest.mock("@/lib/config", () => ({ getConfig: jest.fn() }));

const findUnique = prisma.admin.findUnique as jest.Mock;
const update = prisma.admin.update as jest.Mock;
const passwordMatches = verifyPassword as jest.Mock;

const minutes = (m: number) => new Date(Date.now() + m * 60_000);

function adminRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "admin-1",
    password: "stored-hash",
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    mfaSecret: null,
    ...overrides
  };
}

// A fresh email per call keeps the in-memory per-email rate limit out of the way.
let n = 0;
const credentials = (extra: Record<string, string> = {}) => ({
  email: `admin${++n}@grwtee.test`,
  password: "password",
  ...extra
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("validateAdminLogin lockout", () => {
  it("clears an expired lock, so one wrong password doesn't lock the account again", async () => {
    findUnique.mockResolvedValue(adminRow({ failedLoginAttempts: 5, lockedUntil: minutes(-1) }));
    update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      data.failedLoginAttempts === 0 ? adminRow() : { failedLoginAttempts: 1 }
    );
    passwordMatches.mockResolvedValue(false);

    const result = await validateAdminLogin(credentials());

    expect(result).toEqual({ ok: false, error: "invalid_credentials" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { failedLoginAttempts: 0, lockedUntil: null } })
    );
    expect(update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { lockedUntil: expect.any(Date) } })
    );
  });

  it("keeps a locked account without MFA locked, without checking the password", async () => {
    findUnique.mockResolvedValue(adminRow({ failedLoginAttempts: 5, lockedUntil: minutes(10) }));

    const result = await validateAdminLogin(credentials());

    expect(result).toEqual({ ok: false, error: "account_locked" });
    expect(passwordMatches).not.toHaveBeenCalled();
  });

  it("lets the admin in during a lock with the right password and authenticator code", async () => {
    findUnique.mockResolvedValue(
      adminRow({ failedLoginAttempts: 5, lockedUntil: minutes(10), mfaEnabled: true, mfaSecret: "enc" })
    );
    passwordMatches.mockResolvedValue(true);
    (decryptTotpSecret as jest.Mock).mockReturnValue("secret");
    (verifyTotpCode as jest.Mock).mockReturnValue(true);

    const result = await validateAdminLogin(credentials({ totp: "123456" }));

    expect(result).toEqual({ ok: true, adminId: "admin-1" });
  });

  it.each([
    ["a wrong password", false, "123456", true],
    ["no authenticator code", true, "", true],
    ["a wrong authenticator code", true, "000000", false]
  ])(
    "answers 'locked' for %s during a lock and doesn't extend it",
    async (_case, passwordOk, totp, codeOk) => {
      findUnique.mockResolvedValue(
        adminRow({ failedLoginAttempts: 5, lockedUntil: minutes(10), mfaEnabled: true, mfaSecret: "enc" })
      );
      passwordMatches.mockResolvedValue(passwordOk);
      (decryptTotpSecret as jest.Mock).mockReturnValue("secret");
      (verifyTotpCode as jest.Mock).mockReturnValue(codeOk);

      const result = await validateAdminLogin(credentials(totp ? { totp } : {}));

      // The same answer every time, so a lock never reveals whether the password was right.
      expect(result).toEqual({ ok: false, error: "account_locked" });
      expect(update).not.toHaveBeenCalled();
    }
  );
});
