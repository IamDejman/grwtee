import { render } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { AnalyticsProvider, isPrivatePath } from "@/components/analytics/AnalyticsProvider";

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));
jest.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: () => <div data-testid="ga" />,
  sendGAEvent: jest.fn()
}));

const pathname = usePathname as jest.Mock;

describe("Analytics on private pages", () => {
  it.each([
    ["/december/manage/abc123token", true],
    ["/december/manage", true],
    ["/admin/dashboard", true],
    ["/admin", true],
    ["/december", false],
    ["/administrator-tips", false],
    ["/", false],
    [null, false]
  ])("isPrivatePath(%j) is %s", (path, expected) => {
    expect(isPrivatePath(path)).toBe(expected);
  });

  it("never loads Analytics on a visit that starts on a booking's manage link", () => {
    pathname.mockReturnValue("/december/manage/abc123token");
    const { queryByTestId } = render(<AnalyticsProvider gaId="G-TEST" />);
    expect(queryByTestId("ga")).toBeNull();
    expect((window as unknown as Record<string, boolean>)["ga-disable-G-TEST"]).toBe(true);
  });

  it("loads it on public pages, and switches it off when the visitor moves to a private one", () => {
    pathname.mockReturnValue("/services");
    const { queryByTestId, rerender } = render(<AnalyticsProvider gaId="G-TEST" />);
    expect(queryByTestId("ga")).not.toBeNull();
    expect((window as unknown as Record<string, boolean>)["ga-disable-G-TEST"]).toBe(false);

    pathname.mockReturnValue("/admin/dashboard");
    rerender(<AnalyticsProvider gaId="G-TEST" />);
    expect((window as unknown as Record<string, boolean>)["ga-disable-G-TEST"]).toBe(true);
  });
});
