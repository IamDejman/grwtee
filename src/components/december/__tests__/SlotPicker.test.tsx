import { act, renderHook, waitFor } from "@testing-library/react";
import { prefetchSlots, useSlots, type SlotDays } from "../SlotPicker";

const DAYS: SlotDays = [["2026-11-09", ["2026-11-09T10:00:00.000Z", "2026-11-09T10:30:00.000Z"]]];

let fetchMock: jest.Mock;
let clock = 0;
const realFetch = global.fetch;

beforeEach(() => {
  // Times requested early are kept in module state: moving the clock ten minutes on per test
  // leaves anything an earlier test requested stale.
  clock += 10 * 60_000;
  jest.spyOn(Date, "now").mockImplementation(() => clock);
  fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({ success: true, days: DAYS }) }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = realFetch;
});

describe("useSlots with prefetchSlots", () => {
  it("shows times requested on the brief step straight away, without asking again", async () => {
    prefetchSlots();
    await act(async () => {});
    const { result } = renderHook(() => useSlots());
    expect(result.current.state).toEqual({ status: "ready", days: DAYS });
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks once, not twice, while the early request is still on its way", async () => {
    prefetchSlots();
    const { result } = renderHook(() => useSlots());
    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", days: DAYS }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("loads on the time step when nothing was requested early", async () => {
    const { result } = renderHook(() => useSlots());
    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", days: DAYS }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks again when the early times are over a minute old", async () => {
    prefetchSlots();
    await act(async () => {});
    clock += 61_000;
    const { result } = renderHook(() => useSlots());
    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("asks again after an early request failed", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ success: false }) });
    prefetchSlots();
    await act(async () => {});
    const { result } = renderHook(() => useSlots());
    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", days: DAYS }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reload always asks the server", async () => {
    prefetchSlots();
    await act(async () => {});
    const { result } = renderHook(() => useSlots());
    await act(async () => {
      await result.current.reload();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
