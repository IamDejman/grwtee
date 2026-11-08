/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET } from "../route";
import { requireStylistId } from "@/lib/stylist-auth";

jest.mock("@/lib/stylist-auth", () => ({
  requireStylistId: jest.fn(),
  stylistError: (message: string, status = 500) => Response.json({ error: message }, { status }),
  stylistUnauthorized: () => Response.json({ error: "Unauthorized" }, { status: 401 })
}));

// A stand-in for the service-role client: records each query's calls and resolves with the
// result set for its table.
const calls: Record<string, unknown[][]> = {};
const results: Record<string, { data: unknown; error: unknown }> = {};
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "gte", "order", "limit", "maybeSingle"]) {
        query[method] = (...args: unknown[]) => {
          (calls[table] ??= []).push([method, ...args]);
          return query;
        };
      }
      query.then = (resolve: (value: unknown) => unknown) => resolve(results[table]);
      return query;
    }
  })
}));

const stylist = requireStylistId as jest.Mock;
const AFTER = "2026-11-08T10:00:00.000Z";
const get = (query: string) => GET(new NextRequest(`https://www.grwtee.com/api/stylist/messages?${query}`));

beforeEach(() => {
  for (const key of Object.keys(calls)) delete calls[key];
  stylist.mockResolvedValue("stylist-1");
  results.conversations = { data: { id: "conv-1" }, error: null };
  results.messages = {
    data: [{ id: "m2", sender_id: "client-1", content: "Hello", created_at: "2026-11-08T10:00:05.123456+00:00", image_url: null }],
    error: null
  };
});

describe("GET /api/stylist/messages", () => {
  it("needs a signed-in stylist", async () => {
    stylist.mockResolvedValue(null);
    const res = await get(`conversation_id=conv-1&after=${AFTER}`);
    expect(res.status).toBe(401);
    expect(calls.messages).toBeUndefined();
  });

  it.each([["after=" + AFTER], ["conversation_id=conv-1"], ["conversation_id=conv-1&after=yesterday"]])(
    "rejects %s",
    async (query) => {
      expect((await get(query)).status).toBe(400);
      expect(calls.messages).toBeUndefined();
    }
  );

  it("only reads the stylist's own conversations", async () => {
    results.conversations = { data: null, error: null };
    const res = await get(`conversation_id=conv-9&after=${AFTER}`);
    expect(res.status).toBe(404);
    expect(calls.conversations).toEqual(
      expect.arrayContaining([
        ["eq", "id", "conv-9"],
        ["eq", "stylist_id", "stylist-1"]
      ])
    );
    expect(calls.messages).toBeUndefined();
  });

  it("returns the conversation's messages from `after` on, oldest first, uncached", async () => {
    const res = await get(`conversation_id=conv-1&after=${AFTER}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ messages: results.messages.data });
    expect(calls.messages).toEqual([
      ["select", "id, sender_id, content, created_at, image_url"],
      ["eq", "conversation_id", "conv-1"],
      ["gte", "created_at", AFTER],
      ["order", "created_at", { ascending: true }],
      ["limit", 100]
    ]);
  });

  it("reports a failed read as a server error", async () => {
    results.messages = { data: null, error: { message: "boom" } };
    expect((await get(`conversation_id=conv-1&after=${AFTER}`)).status).toBe(500);
  });
});
