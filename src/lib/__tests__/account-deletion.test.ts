/**
 * @jest-environment node
 */
import { POST as requestDeletion } from "@/app/api/account-deletion/route";
import { POST as confirmDeletion } from "@/app/api/account-deletion/confirm/route";
import { deletionToken, verifyDeletionToken } from "@/lib/app-accounts";
import { sendEmail } from "@/lib/resend";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { fakeSupabase, type FakeSupabase } from "@/test-utils/supabase-fake";

let db: FakeSupabase;

jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }));
jest.mock("@/lib/resend", () => ({ sendEmail: jest.fn(async () => ({})) }));
jest.mock("@/lib/config", () => ({ getConfig: jest.fn(async (_key: string, fallback?: string) => fallback) }));
jest.mock("@/lib/security/rate-limit", () => ({
  ...jest.requireActual("@/lib/security/rate-limit"),
  consumeRateLimit: jest.fn()
}));

const send = sendEmail as jest.Mock;
const env = process.env as Record<string, string | undefined>;
const ENV = { ...process.env };

const post = (handler: (req: Request) => Promise<Response>, body: unknown) =>
  handler(
    new Request("https://grwtee.com/api/account-deletion", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.7" },
      body: JSON.stringify(body)
    })
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "info").mockImplementation(() => {});
  db = fakeSupabase();
  env.NEXTAUTH_SECRET = "test-secret";
  env.NEXT_PUBLIC_SITE_URL = "https://grwtee.com";
  delete env.TURNSTILE_SECRET_KEY;
  delete env.VERCEL_ENV;
  (consumeRateLimit as jest.Mock).mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
});

afterAll(() => {
  process.env = ENV;
});

describe("deletion links", () => {
  it("work for 24 hours for the account they were made for", () => {
    const now = Date.now();
    const token = deletionToken("user-1", now);
    expect(verifyDeletionToken(token, now + 23 * 3_600_000)).toBe("user-1");
    expect(verifyDeletionToken(token, now + 25 * 3_600_000)).toBeNull();
  });

  it("can't be altered to point at someone else", () => {
    const [, signature] = deletionToken("user-1").split(".");
    const forged = Buffer.from(JSON.stringify({ u: "user-2", e: Date.now() + 3_600_000 })).toString("base64url");
    expect(verifyDeletionToken(`${forged}.${signature}`)).toBeNull();
    expect(verifyDeletionToken("nonsense")).toBeNull();
  });
});

describe("asking to delete an account", () => {
  it("emails a link to the account's own address", async () => {
    db.queue("profiles", { data: { id: "user-1", role: "client" } });

    const res = await post(requestDeletion, { email: "Ada@Example.com" });

    expect(res.status).toBe(200);
    expect(db.filters(db.on("profiles")[0])).toEqual({ email: "ada@example.com" });
    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe("ada@example.com");
    const link = mail.text.match(/https:\/\/grwtee\.com\/delete-account\/confirm\?token=(\S+)/);
    expect(verifyDeletionToken(link[1])).toBe("user-1");
  });

  it("answers the same, and sends nothing, when there's no such account", async () => {
    db.queue("profiles", { data: null });
    db.queue("profiles", { data: { id: "user-1", role: "client" } });

    const none = await (await post(requestDeletion, { email: "nobody@example.com" })).json();
    const some = await (await post(requestDeletion, { email: "ada@example.com" })).json();

    expect(none).toEqual(some);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("never offers to delete a stylist or admin account", async () => {
    db.queue("profiles", { data: { id: "stylist-1", role: "stylist" } });
    expect((await post(requestDeletion, { email: "book@grwtee.com" })).status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("limits requests per address", async () => {
    (consumeRateLimit as jest.Mock).mockImplementation(async (key: string) =>
      key.startsWith("account-deletion:") ? { ok: false, retryAfterSeconds: 60 } : { ok: true, retryAfterSeconds: 0 }
    );
    expect((await post(requestDeletion, { email: "ada@example.com" })).status).toBe(429);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("confirming", () => {
  it("removes the person's files, then the account", async () => {
    db.queue("profiles", { data: { id: "user-1", role: "client" } });
    db.files.set("avatars/user-1", ["me.jpg"]);
    db.files.set("wardrobe/user-1", ["a.jpg", "b.jpg"]);
    db.files.set("user-assets/tryon-results/user-1", ["job-final.jpg"]);

    const res = await post(confirmDeletion, { token: deletionToken("user-1") });

    expect(res.status).toBe(200);
    expect(db.removed).toEqual([
      ["avatars:user-1/me.jpg"],
      ["wardrobe:user-1/a.jpg", "wardrobe:user-1/b.jpg"],
      ["user-assets:tryon-results/user-1/job-final.jpg"]
    ]);
    expect(db.deletedUsers).toEqual(["user-1"]);
  });

  it("refuses a link that's expired or made up", async () => {
    const res = await post(confirmDeletion, { token: deletionToken("user-1", Date.now() - 25 * 3_600_000) });
    expect(res.status).toBe(400);
    expect(db.deletedUsers).toEqual([]);
  });

  it("says it's done when the account is already gone", async () => {
    db.queue("profiles", { data: null });
    expect(await (await post(confirmDeletion, { token: deletionToken("user-1") })).json()).toEqual({
      success: true,
      alreadyDeleted: true
    });
  });

  it("won't delete a stylist or admin account even with a link", async () => {
    db.queue("profiles", { data: { id: "admin-1", role: "admin" } });
    expect((await post(confirmDeletion, { token: deletionToken("admin-1") })).status).toBe(403);
    expect(db.deletedUsers).toEqual([]);
  });
});
