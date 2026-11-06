/**
 * @jest-environment node
 */
import { parseEmail } from "../email-validation";

describe("parseEmail", () => {
  it("trims and lowercases accepted addresses", () => {
    expect(parseEmail("  Tee.Stylist+December@GRWTEE.com \n")).toEqual({ ok: true, email: "tee.stylist+december@grwtee.com" });
    expect(parseEmail("o'neil@example.co.uk")).toEqual({ ok: true, email: "o'neil@example.co.uk" });
  });

  it.each(["", "tee", "tee@grwtee", "tee@grwtee.c", ".tee@grwtee.com", "tee.@grwtee.com", "te..e@grwtee.com", "tee@-grwtee.com", "tee@@grwtee.com", "te e@grwtee.com", "é@grwtee.com"])(
    "rejects %j",
    (value) => {
      expect(parseEmail(value)).toEqual({ ok: false, message: "Enter a valid email address" });
    }
  );

  it("rejects a local part over 64 characters", () => {
    expect(parseEmail(`${"a".repeat(64)}@grwtee.com`).ok).toBe(true);
    expect(parseEmail(`${"a".repeat(65)}@grwtee.com`)).toEqual({ ok: false, message: "Enter a valid email address" });
  });

  it("rejects addresses over 254 characters", () => {
    const domain = (length: number) => `${"d".repeat(length - 4)}.com`;
    expect(parseEmail(`tee@${domain(250)}`).ok).toBe(true); // 254 characters
    expect(parseEmail(`tee@${domain(251)}`)).toEqual({ ok: false, message: "Email is too long" });
  });

  it("asks for a permanent address on disposable domains", () => {
    expect(parseEmail("Someone@Mailinator.com")).toEqual({ ok: false, message: "Please use a permanent email address" });
  });

  it("rejects values that aren't strings", () => {
    expect(parseEmail(undefined)).toEqual({ ok: false, message: "Enter a valid email address" });
    expect(parseEmail(42)).toEqual({ ok: false, message: "Enter a valid email address" });
  });
});
