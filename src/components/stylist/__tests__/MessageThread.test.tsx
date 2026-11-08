import { act, fireEvent, render, screen } from "@testing-library/react";
import { MessageThread } from "../MessageThread";

jest.mock("@/components/admin/Toast", () => ({ useToast: () => ({ error: jest.fn(), success: jest.fn() }) }));

type Msg = { id: string; sender_id: string; content: string; created_at: string; image_url: string | null };
const msg = (id: string, sender: string, content: string, at: string): Msg => ({
  id,
  sender_id: sender,
  content,
  created_at: at,
  image_url: null
});

const M1 = msg("m1", "client-1", "First from the client", "2026-11-08T10:00:00.000Z");
const M2 = msg("m2", "client-1", "Second from the client", "2026-11-08T10:00:10.000Z");
const M3 = msg("m3", "stylist-1", "Reply from the stylist", "2026-11-08T10:00:20.000Z");

let fetchMock: jest.Mock;
let polls: string[];
let pollResponses: Array<{ status: number; messages?: Msg[] }>;
const realFetch = global.fetch;

const respond = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.useFakeTimers();
  polls = [];
  pollResponses = [];
  fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return respond(201, { message: M3 });
    polls.push(new URL(url, "https://www.grwtee.com").searchParams.get("after") ?? "");
    const next = pollResponses.shift() ?? { status: 200, messages: [] };
    return respond(next.status, { messages: next.messages });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  setHidden(false);
});

afterEach(() => {
  jest.useRealTimers();
  global.fetch = realFetch;
});

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
}

/** Moves the clock on and lets the poll's fetch settle. */
async function wait(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await act(async () => {});
}

const shown = () => screen.getAllByText(/from the (client|stylist)/).map((p) => p.textContent);

describe("MessageThread polling", () => {
  it("polls the site's API and adds new messages once, in time order", async () => {
    render(<MessageThread conversationId="conv-1" initialMessages={[M1]} currentUserId="stylist-1" />);
    pollResponses.push({ status: 200, messages: [M1, M2] });
    await wait(4000);
    expect(polls).toEqual(["2026-11-08T09:59:30.000Z"]); // 30 s before the newest message seen
    expect(shown()).toEqual(["First from the client", "Second from the client"]);
    expect(fetchMock.mock.calls[0][0]).toContain("conversation_id=conv-1");
  });

  it("doesn't skip a client message that arrived just before the stylist's reply", async () => {
    render(<MessageThread conversationId="conv-1" initialMessages={[M1]} currentUserId="stylist-1" />);
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Reply from the stylist" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await act(async () => {});
    expect(shown()).toEqual(["First from the client", "Reply from the stylist"]);

    // M2 was written before the reply but not fetched yet: the poll still starts from M1.
    pollResponses.push({ status: 200, messages: [M1, M2, M3] });
    await wait(4000);
    expect(polls).toEqual(["2026-11-08T09:59:30.000Z"]);
    expect(shown()).toEqual(["First from the client", "Second from the client", "Reply from the stylist"]);
  });

  it("stops polling once signed out", async () => {
    render(<MessageThread conversationId="conv-1" initialMessages={[M1]} currentUserId="stylist-1" />);
    pollResponses.push({ status: 401 });
    await wait(4000);
    await wait(12000);
    expect(polls).toHaveLength(1);
  });

  it("pauses while the tab is hidden and catches up when it's back", async () => {
    render(<MessageThread conversationId="conv-1" initialMessages={[M1]} currentUserId="stylist-1" />);
    setHidden(true);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await wait(20000);
    expect(polls).toHaveLength(0);

    pollResponses.push({ status: 200, messages: [M2] });
    setHidden(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {});
    expect(polls).toHaveLength(1);
    expect(shown()).toEqual(["First from the client", "Second from the client"]);
  });

  it("starts from the beginning of an empty conversation", async () => {
    render(<MessageThread conversationId="conv-1" initialMessages={[]} currentUserId="stylist-1" />);
    await wait(4000);
    expect(polls).toEqual(["1970-01-01T00:00:00.000Z"]);
  });
});
