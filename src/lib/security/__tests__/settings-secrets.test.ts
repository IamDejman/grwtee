/**
 * @jest-environment node
 */
import { DELETE, GET, PUT } from "@/app/api/settings/env/route";
import { prisma } from "@/lib/prisma";
import { setConfig } from "@/lib/config";

jest.mock("@/lib/prisma", () => ({
  prisma: { siteSettings: { findMany: jest.fn(), deleteMany: jest.fn() } }
}));
jest.mock("@/lib/config", () => ({ setConfig: jest.fn() }));
jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/security/session-auth", () => ({
  requireAdminSession: jest.fn(async () => ({ user: { email: "book@grwtee.test", id: "admin-1" } }))
}));
jest.mock("@/lib/security/step-up", () => ({ requireStepUp: jest.fn(async () => ({ ok: true })) }));
jest.mock("@/lib/security/audit-log", () => ({
  writeAuditLog: jest.fn(),
  requestMeta: () => ({ ip: null, userAgent: null })
}));

const settings = prisma.siteSettings as unknown as Record<string, jest.Mock>;

const put = (vars: { key: string; value: string }[]) =>
  PUT(
    new Request("https://grwtee.com/api/settings/env", {
      method: "PUT",
      body: JSON.stringify({ vars, currentPassword: "password" })
    })
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe("settings env route", () => {
  it.each(["NEXTAUTH_SECRET", "RESEND_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_API_KEY"])(
    "refuses to store %s in the database",
    async (key) => {
      const res = await put([{ key, value: "new-secret" }]);
      expect(res.status).toBe(400);
      expect(setConfig).not.toHaveBeenCalled();
    }
  );

  it("still saves settings that aren't secret", async () => {
    const res = await put([{ key: "CONTACT_EMAIL", value: "book@grwtee.test" }]);
    expect(res.status).toBe(200);
    expect(setConfig).toHaveBeenCalledWith("CONTACT_EMAIL", "book@grwtee.test");
  });

  it("reports where each secret is set", async () => {
    const env = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "from-vercel";
    settings.findMany.mockResolvedValue([{ key: "env_CLOUDINARY_API_SECRET", value: "stored" }]);

    const json = await (await GET()).json();

    expect(json.data.RESEND_API_KEY).toMatchObject({ editable: false, inEnvironment: true, inDatabase: false });
    expect(json.data.CLOUDINARY_API_SECRET).toMatchObject({ editable: false, inDatabase: true, source: "database" });
    expect(json.data.CONTACT_EMAIL).toMatchObject({ editable: true });
    process.env.RESEND_API_KEY = env;
  });

  it("removes a stored copy", async () => {
    const res = await DELETE(
      new Request("https://grwtee.com/api/settings/env", {
        method: "DELETE",
        body: JSON.stringify({ key: "RESEND_API_KEY", currentPassword: "password" })
      })
    );
    expect(res.status).toBe(200);
    expect(settings.deleteMany).toHaveBeenCalledWith({ where: { key: "env_RESEND_API_KEY" } });
  });
});
