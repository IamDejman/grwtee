/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET as cleanup } from "@/app/api/cron/cleanup/route";
import { POST as signUpload } from "@/app/api/upload/sign/route";
import { POST as stylistUpload } from "@/app/api/stylist/uploads/route";
import { deleteExpiredData } from "@/lib/retention";
import { requireAdminSession } from "@/lib/security/session-auth";
import { requireStylist } from "@/lib/stylist-auth";

const mockSignedUpload = jest.fn();

jest.mock("@/lib/retention", () => ({ deleteExpiredData: jest.fn(async () => ({ adminSessions: 2, subscribers: 1 })) }));
jest.mock("@/lib/security/session-auth", () => ({ requireAdminSession: jest.fn() }));
jest.mock("@/lib/config", () => ({
  getConfig: jest.fn(async (key: string, fallback?: string) =>
    ({ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "grwtee-cloud", CLOUDINARY_API_KEY: "key-1", CLOUDINARY_API_SECRET: "shh" })[key] ?? fallback
  )
}));
// The real module loads the sign-in code (and otplib, which Jest can't parse).
jest.mock("@/lib/stylist-auth", () => {
  const { NextResponse } = jest.requireActual("next/server");
  return {
    requireStylist: jest.fn(async () => ({ adminId: "admin-1", profileId: "stylist-1" })),
    stylistError: (message?: string, status = 500) => NextResponse.json({ error: message ?? "Request failed" }, { status }),
    stylistUnauthorized: () => NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  };
});
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: (bucket: string) => ({
        createSignedUploadUrl: (path: string) => mockSignedUpload(bucket, path),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/${bucket}/${path}` }
        })
      })
    }
  })
}));

const env = process.env as Record<string, string | undefined>;
const post = (url: string, body: unknown) =>
  new NextRequest(`https://grwtee.com${url}`, { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  jest.clearAllMocks();
  env.CRON_SECRET = "cron-secret";
  (requireAdminSession as jest.Mock).mockResolvedValue({ user: { id: "admin-1", email: "book@grwtee.com" } });
  mockSignedUpload.mockImplementation(async (bucket: string, path: string) => ({
    data: { signedUrl: `https://project.supabase.co/storage/v1/object/upload/sign/${bucket}/${path}?token=t` },
    error: null
  }));
});

describe("GET /api/cron/cleanup (WEB-23)", () => {
  it("only runs for the scheduler", async () => {
    const res = await cleanup(new Request("https://grwtee.com/api/cron/cleanup", { headers: { authorization: "Bearer wrong" } }));
    expect(res.status).toBe(401);
    expect(deleteExpiredData).not.toHaveBeenCalled();
  });

  it("deletes expired data and says how much went", async () => {
    const res = await cleanup(new Request("https://grwtee.com/api/cron/cleanup", { headers: { authorization: "Bearer cron-secret" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, deleted: { adminSessions: 2, subscribers: 1 } });
  });
});

describe("POST /api/upload/sign (WEB-21)", () => {
  it("needs a signed-in admin", async () => {
    (requireAdminSession as jest.Mock).mockResolvedValue(null);
    expect((await signUpload(post("/api/upload/sign", {}))).status).toBe(401);
  });

  it("only signs uploads to the gallery folder", async () => {
    expect((await signUpload(post("/api/upload/sign", { folder: "looks" }))).status).toBe(400);

    const res = await signUpload(post("/api/upload/sign", {}));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.uploadUrl).toBe("https://api.cloudinary.com/v1_1/grwtee-cloud/image/upload");
    expect(data.fields).toMatchObject({ folder: "grwtee", api_key: "key-1" });
    expect(data.fields).not.toHaveProperty("api_secret");
  });
});

describe("POST /api/stylist/uploads (ARCH-05)", () => {
  it("needs a signed-in stylist", async () => {
    (requireStylist as jest.Mock).mockResolvedValueOnce(null);
    expect((await stylistUpload(post("/api/stylist/uploads", { kind: "look", contentType: "image/jpeg" }))).status).toBe(401);
  });

  it("gives a one-use address in the stylist's own folder of the right bucket", async () => {
    const res = await stylistUpload(post("/api/stylist/uploads", { kind: "lookbook", contentType: "image/png" }));
    expect(res.status).toBe(200);
    const [bucket, path] = mockSignedUpload.mock.calls[0];
    expect(bucket).toBe("lookbooks");
    expect(path).toMatch(/^stylist-1\/[0-9a-f-]{36}\.png$/);
    const { data } = await res.json();
    expect(data.publicUrl).toBe(`https://project.supabase.co/storage/v1/object/public/lookbooks/${path}`);
    expect(data.uploadUrl).toContain(path);
  });

  it("takes photos only", async () => {
    const res = await stylistUpload(post("/api/stylist/uploads", { kind: "look", contentType: "image/svg+xml" }));
    expect(res.status).toBe(400);
    expect(mockSignedUpload).not.toHaveBeenCalled();
  });

  it("says so when storage can't start the upload", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockSignedUpload.mockResolvedValueOnce({ data: null, error: { message: "Bucket not found", statusCode: "404" } });
    const res = await stylistUpload(post("/api/stylist/uploads", { kind: "look", contentType: "image/webp" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Couldn't start the upload. Try again." });
  });
});
