/**
 * @jest-environment node
 */
import { getServerSession } from "next-auth";
import { GET as listBroadcasts, POST as sendBroadcastRoute } from "@/app/api/admin/broadcasts/route";
import { GET as cronBroadcasts } from "@/app/api/cron/broadcasts/route";
import { POST as book } from "@/app/api/december/book/route";
import { createBroadcast, findRecentDuplicate, remainingByBroadcast, resumeBroadcasts, sendBroadcast } from "@/lib/broadcasts";
import { createBooking } from "@/lib/december/booking";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, isRateLimited } from "@/lib/security/rate-limit";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
// The real auth options load otplib, which Jest can't parse.
jest.mock("@/lib/auth", () => ({ getAuthOptions: jest.fn(async () => ({})) }));
jest.mock("@/lib/config", () => ({ getConfig: jest.fn(async (_key: string, fallback?: string) => fallback) }));
jest.mock("@/lib/prisma", () => ({ prisma: { broadcast: { findMany: jest.fn() } } }));
jest.mock("@/lib/broadcasts", () => ({
  ...jest.requireActual("@/lib/broadcasts"),
  createBroadcast: jest.fn(),
  findRecentDuplicate: jest.fn(),
  sendBroadcast: jest.fn(),
  resumeBroadcasts: jest.fn(),
  remainingByBroadcast: jest.fn()
}));
jest.mock("@/lib/december/booking", () => ({
  ...jest.requireActual("@/lib/december/booking"),
  decemberEnabled: () => true,
  createBooking: jest.fn()
}));
jest.mock("@/lib/security/rate-limit", () => ({
  ...jest.requireActual("@/lib/security/rate-limit"),
  consumeRateLimit: jest.fn(),
  isRateLimited: jest.fn()
}));

const session = getServerSession as jest.Mock;
const env = process.env as Record<string, string | undefined>;
const ENV = { ...process.env };

const row = (fields: Record<string, unknown> = {}) => ({
  id: "bc-1",
  subject: "October edit",
  html: "<p>Hi</p>",
  text: "Hi",
  status: "sending",
  sentAt: null,
  recipientCount: 250,
  sentCount: 100,
  failedCount: 0,
  lastError: null,
  siteUrl: "https://grwtee.com",
  createdAt: new Date("2026-10-27T09:00:00Z"),
  updatedAt: new Date("2026-10-27T09:00:00Z"),
  ...fields
});

const post = (handler: (req: Request) => Promise<Response>, body: unknown, headers: Record<string, string> = {}) =>
  handler(
    new Request("https://grwtee.com/api/x", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.7", ...headers },
      body: JSON.stringify(body)
    })
  );

beforeEach(() => {
  jest.clearAllMocks();
  session.mockResolvedValue({ user: { email: "book@grwtee.com", id: "admin-1" } });
  (consumeRateLimit as jest.Mock).mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  (isRateLimited as jest.Mock).mockResolvedValue(false);
  delete env.TURNSTILE_SECRET_KEY;
  delete env.VERCEL_ENV;
});

afterAll(() => {
  process.env = ENV;
});

describe("broadcasts", () => {
  it("needs a signed-in admin", async () => {
    session.mockResolvedValue(null);
    expect((await post(sendBroadcastRoute, { subject: "S", html: "<p>x</p>" })).status).toBe(401);
    expect(createBroadcast).not.toHaveBeenCalled();
  });

  it("queues the broadcast and sends what it can within the request", async () => {
    (findRecentDuplicate as jest.Mock).mockResolvedValue(null);
    (createBroadcast as jest.Mock).mockResolvedValue(row());
    (sendBroadcast as jest.Mock).mockResolvedValue({ id: "bc-1", status: "sending", remaining: 150 });

    const res = await post(sendBroadcastRoute, { subject: "October edit", html: "<p>Hi</p>" });

    expect(res.status).toBe(200);
    expect(createBroadcast).toHaveBeenCalledWith({ subject: "October edit", html: "<p>Hi</p>", siteUrl: "https://grwtee.com" });
    expect(sendBroadcast).toHaveBeenCalledWith("bc-1", 25_000);
    expect((await res.json()).data).toMatchObject({ status: "sending", remaining: 150 });
  });

  it("won't send the same broadcast twice in a day", async () => {
    (findRecentDuplicate as jest.Mock).mockResolvedValue(row({ status: "sent" }));
    const res = await post(sendBroadcastRoute, { subject: "October edit", html: "<p>Hi</p>" });
    expect(res.status).toBe(409);
    expect(createBroadcast).not.toHaveBeenCalled();
  });

  it("lists broadcasts with how many are still to send", async () => {
    (prisma.broadcast.findMany as jest.Mock).mockResolvedValue([row(), row({ id: "bc-0", status: "sent" })]);
    (remainingByBroadcast as jest.Mock).mockResolvedValue(new Map([["bc-1", 150]]));

    const json = await (await listBroadcasts()).json();

    expect(remainingByBroadcast).toHaveBeenCalledWith(["bc-1"]);
    expect(json.data.map((b: { id: string; remaining: number }) => [b.id, b.remaining])).toEqual([
      ["bc-1", 150],
      ["bc-0", 0]
    ]);
    expect(json.data[0]).not.toHaveProperty("html");
  });

  it("finishes broadcasts from the scheduled job only with the cron secret", async () => {
    env.CRON_SECRET = "cron-secret";
    (resumeBroadcasts as jest.Mock).mockResolvedValue([]);
    const call = (auth?: string) =>
      cronBroadcasts(new Request("https://grwtee.com/api/cron/broadcasts", { headers: auth ? { authorization: auth } : {} }));

    expect((await call()).status).toBe(401);
    expect(resumeBroadcasts).not.toHaveBeenCalled();
    expect((await call("Bearer cron-secret")).status).toBe(200);
    expect(resumeBroadcasts).toHaveBeenCalledWith(45_000);
  });
});

describe("December bookings", () => {
  const booked = { status: "pending", slotStart: "2026-12-18T10:00:00.000Z", holdExpiresAt: null, meetUrl: null, manageUrl: "https://grwtee.com/december/manage/t" };

  it("counts booking attempts per IP and refuses when over the limit", async () => {
    (consumeRateLimit as jest.Mock).mockResolvedValue({ ok: false, retryAfterSeconds: 600 });
    const res = await post(book, { clientRef: "x" });
    expect(res.status).toBe(429);
    expect(consumeRateLimit).toHaveBeenCalledWith("form:december-book:198.51.100.7", 10, 3_600_000);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("allows three new holds per IP a day", async () => {
    (isRateLimited as jest.Mock).mockResolvedValue(true);
    const res = await post(book, { clientRef: "x" });
    expect(res.status).toBe(429);
    expect(isRateLimited).toHaveBeenCalledWith("december-holds:198.51.100.7", 3, 86_400_000);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("counts a new booking against the IP, but not a retried one", async () => {
    (createBooking as jest.Mock).mockResolvedValueOnce(booked).mockResolvedValueOnce({ ...booked, manageUrl: null });

    expect((await post(book, { clientRef: "x" })).status).toBe(200);
    expect(consumeRateLimit).toHaveBeenCalledWith("december-holds:198.51.100.7", 3, 86_400_000);

    (consumeRateLimit as jest.Mock).mockClear();
    expect((await post(book, { clientRef: "x" })).status).toBe(200);
    expect(consumeRateLimit).not.toHaveBeenCalledWith("december-holds:198.51.100.7", expect.anything(), expect.anything());
  });

  it("needs Turnstile on the live site", async () => {
    env.VERCEL_ENV = "production";
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(book, { clientRef: "x" });
    expect(res.status).toBe(400);
    expect(createBooking).not.toHaveBeenCalled();
  });
});
