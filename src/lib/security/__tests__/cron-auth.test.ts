/**
 * @jest-environment node
 */
import { cronAuthorised } from "../cron-auth";

const req = (authorization?: string) =>
  new Request("https://grwtee.com/api/cron/december-holds", authorization ? { headers: { authorization } } : {});

describe("cronAuthorised", () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    process.env.CRON_SECRET = original;
  });

  it("accepts only the exact bearer secret", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(cronAuthorised(req("Bearer s3cret"))).toBe(true);
    expect(cronAuthorised(req("Bearer wrong!"))).toBe(false);
    expect(cronAuthorised(req("s3cret"))).toBe(false);
    expect(cronAuthorised(req())).toBe(false);
  });

  it("refuses everything when no secret is configured", () => {
    delete process.env.CRON_SECRET;
    expect(cronAuthorised(req("Bearer "))).toBe(false);
    expect(cronAuthorised(req("Bearer undefined"))).toBe(false);
  });
});
