/**
 * @jest-environment node
 */
import { POST as contact } from "@/app/api/contact/route";
import { POST as booking } from "@/app/api/bookings/route";
import { POST as waitlist } from "@/app/api/waitlist/route";
import { POST as subscribe } from "@/app/api/newsletter/subscribe/route";
import { POST as unsubscribe } from "@/app/api/newsletter/unsubscribe/route";
import { safeFirstName } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    bookingRequest: { create: jest.fn() },
    waitlistEntry: { findUnique: jest.fn(), create: jest.fn() },
    subscriber: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() }
  }
}));
jest.mock("@/lib/resend", () => ({ sendEmail: jest.fn(async () => ({})) }));
jest.mock("@/lib/config", () => ({ getConfig: jest.fn(async (_key: string, fallback?: string) => fallback) }));
jest.mock("@/lib/security/rate-limit", () => ({
  ...jest.requireActual("@/lib/security/rate-limit"),
  consumeRateLimit: jest.fn()
}));
jest.mock("@/lib/security/session-auth", () => ({ requireAdminSession: jest.fn() }));

const send = sendEmail as jest.Mock;
const limit = consumeRateLimit as jest.Mock;
const env = process.env as Record<string, string | undefined>;
const ENV = { ...process.env };

const post = (handler: (req: Request) => Promise<Response>, body: unknown, ip = "198.51.100.7") =>
  handler(
    new Request("https://grwtee.com/api/form", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body)
    })
  );

const enquiry = {
  name: "Ada Obi",
  email: "ada@example.com",
  phone: "+2348031234567",
  service: "virtual-personal-styling",
  message: "I need help with a wedding look."
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
  limit.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  delete env.TURNSTILE_SECRET_KEY;
  delete env.VERCEL_ENV;
  env.NODE_ENV = "test";
});

afterAll(() => {
  process.env = ENV;
});

describe("Turnstile", () => {
  it("fails closed on the live site when the secret key isn't set", async () => {
    env.VERCEL_ENV = "production";
    expect(await verifyTurnstileToken("token")).toMatchObject({ ok: false });
  });

  it("lets previews and local development through without keys", async () => {
    env.VERCEL_ENV = "preview";
    expect(await verifyTurnstileToken(undefined)).toEqual({ ok: true });
    delete env.VERCEL_ENV;
    expect(await verifyTurnstileToken(undefined)).toEqual({ ok: true });
  });
});

describe("public form limits", () => {
  it("counts each form per IP in the database and answers 429 with Retry-After", async () => {
    limit.mockResolvedValue({ ok: false, retryAfterSeconds: 1200 });
    const res = await post(contact, enquiry);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1200");
    expect(limit).toHaveBeenCalledWith("form:contact:198.51.100.7", 5, 3_600_000);
    expect(prisma.bookingRequest.create).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a submission the live site can't check with Turnstile", async () => {
    env.VERCEL_ENV = "production";
    const res = await post(waitlist, { email: "ada@example.com" });
    expect(res.status).toBe(400);
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it.each([
    ["a name over 120 characters", { name: "A".repeat(121) }],
    ["a message over 5000 characters", { message: "x".repeat(5001) }],
    ["a service that isn't offered", { service: "Click https://evil.example to claim your refund" }]
  ])("refuses %s", async (_case, change) => {
    const res = await post(booking, { ...enquiry, ...change });
    expect(res.status).toBe(400);
    expect(prisma.bookingRequest.create).not.toHaveBeenCalled();
  });

  it("caps newsletter confirmation emails per address, whichever IPs ask", async () => {
    (prisma.subscriber.findUnique as jest.Mock).mockResolvedValue(null);
    limit.mockImplementation(async (key: string) =>
      key.startsWith("newsletter-confirm:") ? { ok: false, retryAfterSeconds: 3600 } : { ok: true, retryAfterSeconds: 0 }
    );
    const res = await post(subscribe, { email: "victim@example.com" });
    expect(res.status).toBe(429);
    expect(limit).toHaveBeenCalledWith("newsletter-confirm:victim@example.com", 3, 86_400_000);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("emails to whoever filled in a form", () => {
  const phishing = "Your account is locked, visit https://evil.example now";

  it("carry no text they typed except a plain first name", async () => {
    const res = await post(contact, { ...enquiry, name: phishing, message: "Pay at https://evil.example" });
    expect(res.status).toBe(200);

    const toSender = send.mock.calls.map((c) => c[0]).find((m) => m.to === "ada@example.com");
    // At most one plain word of the name gets through: never the rest, never a link.
    expect(toSender.text).toMatch(/^Hi Your,\n/);
    for (const part of [toSender.html, toSender.text]) {
      expect(part).not.toContain("evil.example");
      expect(part).not.toContain("account is locked");
    }
    expect(toSender.text).toContain("Service interest: Virtual Personal Styling");

    // The team still sees everything.
    const toTeam = send.mock.calls.map((c) => c[0]).find((m) => m.to === "book@grwtee.com");
    expect(toTeam.text).toContain(phishing);
  });

  it("greets by first name when it's just a name", async () => {
    await post(booking, { ...enquiry, name: "Adaeze Obi" });
    const toSender = send.mock.calls.map((c) => c[0]).find((m) => m.to === "ada@example.com");
    expect(toSender.text).toMatch(/^Hi Adaeze,\n/);
    expect(toSender.html).toContain("Hi Adaeze,");
  });

  it("leave a link out of the waitlist confirmation", async () => {
    (prisma.waitlistEntry.findUnique as jest.Mock).mockResolvedValue(null);
    await post(waitlist, { email: "victim@example.com", name: "evil.example/claim" });
    const mail = send.mock.calls[0][0];
    expect(mail.html).not.toContain("evil.example");
    expect(mail.text).not.toContain("evil.example");
  });

  it.each([
    ["Ada Obi", "Ada"],
    ["  Chí-ọma  Nwosu", "Chí-ọma"],
    ["O'Brien", "O'Brien"],
    ["evil.example", null],
    ["https://x.y", null],
    ["Ada123", null],
    ["", null]
  ])("safeFirstName(%j) is %j", (name, expected) => {
    expect(safeFirstName(name)).toBe(expected);
  });
});

describe("one-click unsubscribe", () => {
  const request = (token: string) =>
    unsubscribe(
      new Request(`https://grwtee.com/api/newsletter/unsubscribe?token=${token}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click"
      })
    );

  it("unsubscribes from the mail app's button without a page", async () => {
    (prisma.subscriber.findUnique as jest.Mock).mockResolvedValue({ id: "s1", status: "confirmed" });
    const res = await request("tok-1");
    expect(res.status).toBe(200);
    expect(prisma.subscriber.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { status: "unsubscribed", unsubscribedAt: expect.any(Date) }
    });
  });

  it("answers 404 for an unknown link", async () => {
    (prisma.subscriber.findUnique as jest.Mock).mockResolvedValue(null);
    expect((await request("nope")).status).toBe(404);
    expect(prisma.subscriber.update).not.toHaveBeenCalled();
  });
});
