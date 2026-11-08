/** @jest-environment node */
import { Prisma, type Service } from "@prisma/client";
import type { ErrorEvent } from "@sentry/nextjs";
import { v2 as cloudinary } from "cloudinary";
import { isOwnGalleryUpload, signGalleryUpload } from "@/lib/cloudinary";
import { csvCell, csvRows } from "@/lib/csv";
import { computeTotals, parseItems } from "@/lib/invoice-totals";
import { httpUrlOr, jsonLd } from "@/lib/json-ld";
import { prisma } from "@/lib/prisma";
import { deleteExpiredData, RETENTION_DAYS } from "@/lib/retention";
import { scrubEvent } from "@/lib/sentry-scrub";
import { serviceJson } from "@/lib/services";
import { clampLimit } from "@/lib/utils";

jest.mock("@/lib/config", () => ({
  getConfig: jest.fn(async (key: string, fallback?: string) =>
    ({ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "grwtee-cloud", CLOUDINARY_API_KEY: "key-1", CLOUDINARY_API_SECRET: "shh" })[key] ?? fallback
  )
}));
jest.mock("@/lib/prisma", () => {
  const model = () => ({ deleteMany: jest.fn(async () => ({ count: 1 })) });
  return {
    prisma: {
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
      adminSession: model(),
      passwordResetOtp: model(),
      securityEvent: model(),
      adminAuditLog: model(),
      rateLimitBucket: model(),
      bookingRequest: model(),
      decemberBooking: model(),
      decemberDraft: model(),
      subscriber: model(),
      broadcastRecipient: model()
    }
  };
});

describe("CSV exports (WEB-24)", () => {
  it("keeps a spreadsheet from running a formula someone typed into a form", () => {
    expect(csvCell('=HYPERLINK("https://evil.example","Click")')).toBe('"\'=HYPERLINK(""https://evil.example"",""Click"")"');
    expect(csvCell("+234 801 234 5678")).toBe("'+234 801 234 5678");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@ada")).toBe("'@ada");
  });

  it("quotes commas, quotes and line breaks, and leaves the rest alone", () => {
    expect(csvRows(["Name", "Note"], [["Ada, Obi", 'Said "hi"\nthen left'], ["Tee", null]])).toBe(
      'Name,Note\n"Ada, Obi","Said ""hi""\nthen left"\nTee,'
    );
  });
});

describe("structured data (WEB-17)", () => {
  it("can't be closed early by a value with </script> in it", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>", note: "a & b \u2028" });
    expect(out).not.toMatch(/[<>&\u2028]/);
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>", note: "a & b \u2028" });
  });

  it("only takes web addresses for links", () => {
    expect(httpUrlOr("https://instagram.com/grwtee", "https://grwtee.com")).toBe("https://instagram.com/grwtee");
    expect(httpUrlOr("javascript:alert(1)", "https://grwtee.com")).toBe("https://grwtee.com");
    expect(httpUrlOr(undefined, "https://grwtee.com")).toBe("https://grwtee.com");
  });
});

describe("clampLimit", () => {
  it("keeps list sizes between 1 and the maximum", () => {
    expect(clampLimit(null, 50, 200)).toBe(50);
    expect(clampLimit("abc", 50, 200)).toBe(50);
    expect(clampLimit("100000", 50, 200)).toBe(200);
    expect(clampLimit("-5", 50, 200)).toBe(1);
    expect(clampLimit("20", 50, 200)).toBe(20);
  });
});

describe("invoice totals (WEB-23)", () => {
  it("adds up in kobo or cents, so totals don't drift", () => {
    const totals = computeTotals([
      { description: "Styling", quantity: 3, unitPrice: 0.1, vat: true },
      { description: "Travel", quantity: 1, unitPrice: 25000.5, vat: false }
    ]);
    expect(totals).toEqual({ subtotal: 25000.8, vat: 0.02, total: 25000.82 });
  });

  it("reads the JSON column and the text it held before", () => {
    const item = { description: "Styling", quantity: 1, unitPrice: 100, vat: false };
    expect(parseItems([item])).toEqual([item]);
    expect(parseItems(JSON.stringify([item]))).toEqual([item]);
    expect(parseItems("not json")).toEqual([]);
    expect(parseItems({ description: "x" })).toEqual([]);
  });
});

describe("serviceJson", () => {
  it("sends exact prices as numbers", () => {
    const service = { id: "s1", priceUSD: new Prisma.Decimal("120.50"), priceNGN: null } as unknown as Service;
    expect(serviceJson(service)).toMatchObject({ priceUSD: 120.5, priceNGN: null });
  });
});

describe("Sentry events (OPS-07)", () => {
  it("lose what could identify a person before they're sent", () => {
    const event = scrubEvent({
      type: undefined,
      request: {
        url: "https://grwtee.com/book?email=ada@example.com",
        query_string: "email=ada@example.com",
        cookies: { "next-auth.session-token": "secret" },
        data: '{"phone":"+2348012345678"}',
        headers: { Cookie: "x=1", Authorization: "Bearer t", "User-Agent": "Safari" }
      },
      user: { id: "admin-1", email: "book@grwtee.com", ip_address: "198.51.100.7" },
      breadcrumbs: [
        { category: "console", message: "Booking from ada@example.com" },
        { category: "fetch", data: { url: "https://grwtee.com/api/x?token=abc", "http.query": "token=abc" } }
      ]
    } as ErrorEvent);

    expect(event.request).toEqual({ url: "https://grwtee.com/book", headers: { "User-Agent": "Safari" } });
    expect(event.user).toEqual({ id: "admin-1" });
    expect(event.breadcrumbs).toEqual([{ category: "fetch", data: { url: "https://grwtee.com/api/x" } }]);
  });
});

describe("data retention (WEB-23)", () => {
  const now = new Date("2026-10-28T03:23:00Z");
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000);
  const where = (model: keyof typeof prisma) =>
    ((prisma[model] as unknown as { deleteMany: jest.Mock }).deleteMany.mock.calls[0][0] as { where: unknown }).where;

  beforeEach(() => jest.clearAllMocks());

  it("deletes everything past its time in one transaction", async () => {
    const deleted = await deleteExpiredData(now);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(Object.keys(deleted)).toHaveLength(10);
    expect(Object.values(deleted).every((n) => n === 1)).toBe(true);
    expect(where("securityEvent")).toEqual({ createdAt: { lt: ago(RETENTION_DAYS.securityEvents) } });
    expect(where("adminAuditLog")).toEqual({ createdAt: { lt: ago(730) } });
    expect(where("subscriber")).toEqual({
      OR: [
        { status: "pending", createdAt: { lt: ago(30) } },
        { status: "unsubscribed", unsubscribedAt: { lt: ago(30) } }
      ]
    });
  });

  it("keeps December consultations two years, lapsed holds 90 days", async () => {
    await deleteExpiredData(now);
    expect(where("decemberBooking")).toEqual({
      OR: [
        { slotEnd: { lt: ago(730) } },
        { status: { in: ["cancelled", "expired"] }, slotEnd: { lt: ago(90) } }
      ]
    });
  });
});

describe("gallery uploads (WEB-21)", () => {
  it("are signed for our folder, a random name and image formats only", async () => {
    const { uploadUrl, fields } = await signGalleryUpload("grwtee");
    const { api_key, signature, ...rest } = fields;
    const signed = rest as Record<string, string | number>;

    expect(uploadUrl).toBe("https://api.cloudinary.com/v1_1/grwtee-cloud/image/upload");
    expect(api_key).toBe("key-1");
    expect(signed.folder).toBe("grwtee");
    expect(String(signed.public_id)).toMatch(/^[0-9a-f]{32}$/);
    expect(String(signed.allowed_formats).split(",")).not.toContain("gif");
    expect(signature).toBe(cloudinary.utils.api_sign_request(signed, "shh"));
    // Changing the folder in the browser breaks the signature.
    expect(signature).not.toBe(cloudinary.utils.api_sign_request({ ...signed, folder: "elsewhere" }, "shh"));
  });

  it("are only saved when they're in our cloud and folder", async () => {
    const url = "https://res.cloudinary.com/grwtee-cloud/image/upload/v1730000000/grwtee/abc123.jpg";
    expect(await isOwnGalleryUpload(url, "grwtee/abc123")).toBe(true);
    expect(await isOwnGalleryUpload(url.replace("grwtee-cloud", "someone-else"), "grwtee/abc123")).toBe(false);
    expect(await isOwnGalleryUpload(url.replace("/grwtee/", "/other/"), "other/abc123")).toBe(false);
    expect(await isOwnGalleryUpload(url.replace("https:", "http:"), "grwtee/abc123")).toBe(false);
    expect(await isOwnGalleryUpload(url, "grwtee/not-this-one")).toBe(false);
  });
});
