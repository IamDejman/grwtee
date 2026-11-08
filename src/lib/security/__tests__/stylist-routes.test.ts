/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { PATCH as approve } from "@/app/api/stylist/approvals/route";
import { PATCH as review } from "@/app/api/stylist/reports/route";
import { POST as createLook } from "@/app/api/stylist/looks/route";
import { PATCH as patchLook } from "@/app/api/stylist/looks/[id]/route";
import { PUT as updateLookbook } from "@/app/api/stylist/lookbooks/[id]/route";
import { PUT as planDay } from "@/app/api/stylist/calendar/[calendarId]/days/route";
import { sendEmail } from "@/lib/resend";
import { fakeSupabase, type FakeSupabase } from "@/test-utils/supabase-fake";

let db: FakeSupabase;

jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }));
// The real module loads the sign-in code (and otplib, which Jest can't parse).
jest.mock("@/lib/stylist-auth", () => {
  const { NextResponse } = jest.requireActual("next/server");
  return {
    requireStylist: jest.fn(async () => ({ adminId: "admin-1", profileId: "stylist-1" })),
    requireStylistId: jest.fn(async () => "stylist-1"),
    stylistError: (message?: string, status = 500) => NextResponse.json({ error: message ?? "Request failed" }, { status }),
    stylistUnauthorized: () => NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  };
});
jest.mock("@/lib/resend", () => ({ sendEmail: jest.fn(async () => ({})) }));
jest.mock("@/lib/security/audit-log", () => ({
  writeAuditLog: jest.fn(),
  requestMeta: () => ({ ip: null, userAgent: null })
}));

const ID = "6f1c2b8e-2a4b-4c1d-9e3f-0a1b2c3d4e5f";
const CLIENT = "0d8f0a52-3b7a-4f5e-8a61-1c2d3e4f5a6b";

const req = (method: string, body: unknown) =>
  new NextRequest("https://grwtee.com/api/stylist/x", { method, body: JSON.stringify(body) });
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

beforeEach(() => {
  jest.clearAllMocks();
  db = fakeSupabase();
});

describe("sign-up approvals", () => {
  it("approves a client account and emails them", async () => {
    db.queue("profiles", { data: { id: ID, email: "ada@example.com", full_name: "Ada Obi", approval_status: "approved" } });

    const res = await approve(req("PATCH", { id: ID, decision: "approve" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ emailed: true });
    const [update] = db.on("profiles");
    expect(db.arg(update, "update")).toMatchObject({ approval_status: "approved", approval_decided_by: "stylist-1" });
    // Only client accounts: a request can't change a stylist or admin.
    expect(db.filters(update)).toEqual({ id: ID, role: "client" });
    expect((sendEmail as jest.Mock).mock.calls[0][0]).toMatchObject({ to: "ada@example.com", subject: "Your GRWTEE account is ready" });
  });

  it("declines without an email", async () => {
    db.queue("profiles", { data: { id: ID, email: "ada@example.com", approval_status: "declined" } });
    const res = await approve(req("PATCH", { id: ID, decision: "decline" }));
    expect(res.status).toBe(200);
    expect(db.arg(db.on("profiles")[0], "update")).toMatchObject({ approval_status: "declined" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("answers 404 for an id that isn't a client", async () => {
    db.queue("profiles", { data: null });
    expect((await approve(req("PATCH", { id: ID, decision: "approve" }))).status).toBe(404);
  });

  it("refuses anything but approve or decline", async () => {
    expect((await approve(req("PATCH", { id: ID, decision: "make_admin" }))).status).toBe(400);
    expect(db.on("profiles")).toHaveLength(0);
  });
});

describe("reports", () => {
  const report = (fields: Record<string, unknown>) => ({
    data: { id: ID, target_type: "comment", target_id: "c1", status: "open", content_hidden: true, ...fields }
  });

  it("restores hidden content and closes every open report about it", async () => {
    db.queue("content_reports", report({}));

    const res = await review(req("PATCH", { id: ID, action: "restore" }));

    expect(res.status).toBe(200);
    const [restore] = db.on("comments");
    expect(db.arg(restore, "update")).toEqual({ hidden_at: null });
    expect(db.filters(restore)).toEqual({ id: "c1" });
    const close = db.on("content_reports")[1];
    expect(db.arg(close, "update")).toMatchObject({ status: "restored", reviewed_by: "stylist-1" });
    expect(db.filters(close)).toEqual({ target_type: "comment", target_id: "c1", status: "open" });
  });

  it("deletes a reported try-on image, files included", async () => {
    db.queue("content_reports", report({ target_type: "tryon_result", target_id: "job-1" }));
    db.queue("tryon_jobs", { data: { user_id: "user-9" } });

    const res = await review(req("PATCH", { id: ID, action: "remove" }));

    expect(res.status).toBe(200);
    expect(db.removed).toEqual([
      ["user-assets:tryon-results/user-9/job-1-final.jpg", "user-assets:tryon-results/user-9/job-1-intermediate.jpg"]
    ]);
    const [, remove] = db.on("tryon_jobs");
    expect(remove.ops.some(([m]) => m === "delete")).toBe(true);
    expect(db.filters(remove)).toEqual({ id: "job-1" });
  });

  it("won't dismiss content that's hidden: it has to be restored or removed", async () => {
    db.queue("content_reports", report({}));
    expect((await review(req("PATCH", { id: ID, action: "dismiss" }))).status).toBe(400);
  });

  it("only dismisses reports about looks, lookbooks and people", async () => {
    db.queue("content_reports", report({ target_type: "look", content_hidden: false }));
    expect((await review(req("PATCH", { id: ID, action: "remove" }))).status).toBe(400);
    expect(db.on("looks")).toHaveLength(0);
  });

  it("answers 409 for a report already reviewed", async () => {
    db.queue("content_reports", report({ status: "restored" }));
    expect((await review(req("PATCH", { id: ID, action: "restore" }))).status).toBe(409);
  });
});

describe("looks, lookbooks and calendar: allowed fields only", () => {
  const look = {
    title: "Office Monday",
    occasion: "corporate",
    primary_image_url: "https://res.cloudinary.com/demo/look.jpg",
    is_published: true,
    items: [{ category: "top", name: "Silk blouse", price: "1500" }]
  };

  it("saves a new look without fields the form never sends", async () => {
    db.queue("looks", { data: { id: "look-1" } });

    const res = await createLook(req("POST", { ...look, likes_count: 999, stylist_id: "someone-else", id: "chosen" }));

    expect(res.status).toBe(201);
    const inserted = db.arg(db.on("looks")[0], "insert") as Record<string, unknown>;
    expect(inserted).toMatchObject({ title: "Office Monday", stylist_id: "stylist-1" });
    expect(inserted).not.toHaveProperty("likes_count");
    expect(inserted).not.toHaveProperty("id");
    expect(db.arg(db.on("look_items")[0], "insert")).toEqual([
      expect.objectContaining({ name: "Silk blouse", price: 1500, look_id: "look-1", sort_order: 0 })
    ]);
  });

  it("removes the new look again when its items can't be saved", async () => {
    db.queue("looks", { data: { id: "look-1" } });
    db.queue("look_items", { error: { message: "insert failed" } });

    const res = await createLook(req("POST", look));

    expect(res.status).toBe(500);
    const [, cleanup] = db.on("looks");
    expect(cleanup.ops.some(([m]) => m === "delete")).toBe(true);
    expect(db.filters(cleanup)).toEqual({ id: "look-1" });
  });

  it("explains what's missing", async () => {
    const res = await createLook(req("POST", { ...look, primary_image_url: "" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Add a cover photo." });
  });

  it("publishing from the grid changes nothing else", async () => {
    db.queue("looks", { data: { id: "look-1" } });
    await patchLook(req("PATCH", { is_published: false, views_count: 0 }), params({ id: "look-1" }));
    const update = db.arg(db.on("looks")[0], "update") as Record<string, unknown>;
    expect(Object.keys(update).sort()).toEqual(["is_published", "updated_at"]);
  });

  const lookbook = { title: "Lagos wedding weekend", assigned_to: CLIENT, show_in_feed: true };

  it("dates a lookbook in the app's feed when it joins the feed, not on every save", async () => {
    db.queue("profiles", { data: { id: CLIENT } });
    db.queue("lookbooks", { data: { show_in_feed: false } }, { data: { id: "lb-1" } });
    await updateLookbook(req("PUT", lookbook), params({ id: "lb-1" }));
    expect(db.arg(db.on("lookbooks")[1], "update")).toMatchObject({ show_in_feed: true, feed_published_at: expect.any(String) });

    db = fakeSupabase();
    db.queue("profiles", { data: { id: CLIENT } });
    db.queue("lookbooks", { data: { show_in_feed: true } }, { data: { id: "lb-1" } });
    await updateLookbook(req("PUT", lookbook), params({ id: "lb-1" }));
    expect(db.arg(db.on("lookbooks")[1], "update")).not.toHaveProperty("feed_published_at");
  });

  it("only assigns a lookbook to a client", async () => {
    db.queue("profiles", { data: null });
    const res = await updateLookbook(req("PUT", lookbook), params({ id: "lb-1" }));
    expect(res.status).toBe(400);
    expect(db.on("lookbooks")).toHaveLength(0);
  });

  it("plans only days in the calendar's own month", async () => {
    db.queue("stylist_calendars", { data: { id: "cal-1", month: 11, year: 2026 } });
    const res = await planDay(req("PUT", { date: "2026-12-01", occasion: "work" }), params({ calendarId: "cal-1" }));
    expect(res.status).toBe(400);
    expect(db.on("stylist_calendar_days")).toHaveLength(0);
  });
});
