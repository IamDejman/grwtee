import { keepSending, progressSummary, sendingLine, type BroadcastProgress } from "@/lib/broadcast-progress";
import { adminFetch } from "@/lib/adminFetch";

jest.mock("@/lib/adminFetch", () => ({ adminFetch: jest.fn() }));

const fetchMock = adminFetch as jest.Mock;

const progress = (fields: Partial<BroadcastProgress>): BroadcastProgress => ({
  id: "bc-1",
  subject: "October edit",
  status: "sending",
  recipientCount: 1000,
  sentCount: 0,
  failedCount: 0,
  remaining: 1000,
  lastError: null,
  sentAt: null,
  createdAt: "2026-10-27T09:00:00Z",
  ...fields
});

const reply = (data: BroadcastProgress) => ({ ok: true, json: async () => ({ success: true, data }) });

beforeEach(() => fetchMock.mockReset());

describe("keepSending", () => {
  it("asks for more until the broadcast is out", async () => {
    fetchMock
      .mockResolvedValueOnce(reply(progress({ sentCount: 600, remaining: 400 })))
      .mockResolvedValueOnce(reply(progress({ status: "sent", sentCount: 1000, remaining: 0 })));
    const seen: number[] = [];

    const final = await keepSending(progress({ sentCount: 300, remaining: 700 }), (p) => seen.push(p.remaining));

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/broadcasts/bc-1/send", { method: "POST" });
    expect(seen).toEqual([400, 0]);
    expect(final.status).toBe("sent");
    expect(progressSummary(final)).toBe("1,000 sent.");
  });

  it("stops when sending pauses with a reason", async () => {
    fetchMock.mockResolvedValueOnce(
      reply(progress({ sentCount: 500, remaining: 500, lastError: "Resend’s daily sending limit is reached." }))
    );
    const final = await keepSending(progress({ remaining: 1000 }), () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(progressSummary(final)).toBe("Paused with 500 still to send. Resend’s daily sending limit is reached.");
  });

  it("stops when nothing moves, because a batch is waiting to be retried", async () => {
    fetchMock.mockResolvedValueOnce(reply(progress({ sentCount: 900, remaining: 100 })));
    const final = await keepSending(progress({ sentCount: 900, remaining: 100 }), () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(progressSummary(final)).toMatch(/100 are waiting to be retried/);
  });

  it("doesn't ask at all for a broadcast that's already out", async () => {
    await keepSending(progress({ status: "sent", remaining: 0 }), () => {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows how far it's got", () => {
    expect(sendingLine(progress({ remaining: 700 }))).toBe("Sending… 300 of 1,000.");
  });
});
