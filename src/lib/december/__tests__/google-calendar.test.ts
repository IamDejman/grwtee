/**
 * @jest-environment node
 */
import { createVerify, generateKeyPairSync } from "crypto";
import { CalendarError, deleteEvent, insertEvent, inviteAttendee, queryBusy, signServiceAccountJwt } from "../google-calendar";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, statusText: "", json: async () => body }) as Response;

describe("google-calendar", () => {
  const fetchMock = jest.fn();

  beforeAll(() => {
    process.env.GOOGLE_SA_EMAIL = "booking@grwtee-project.iam.gserviceaccount.com";
    // Vercel stores the key with literal \n; the client must restore newlines.
    process.env.GOOGLE_SA_PRIVATE_KEY = pem.replace(/\n/g, "\\n");
    process.env.GOOGLE_CALENDAR_SUBJECT = "book@grwtee.com";
    process.env.DECEMBER_BUSY_CALENDARS = "studio@grwtee.com";
    global.fetch = fetchMock;
  });

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("https://oauth2.googleapis.com/token")
        ? json({ access_token: "token-1", expires_in: 3600 })
        : json({})
    );
  });

  it("signs a JWT that impersonates the booking mailbox with calendar scopes only", () => {
    const jwt = signServiceAccountJwt(
      { clientEmail: "sa@x.iam.gserviceaccount.com", privateKey: pem, subject: "book@grwtee.com" },
      1_800_000_000
    );
    const [header, claims, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toEqual({
      iss: "sa@x.iam.gserviceaccount.com",
      sub: "book@grwtee.com",
      scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1_800_000_000,
      exp: 1_800_003_600
    });
    const valid = createVerify("RSA-SHA256").update(`${header}.${claims}`).verify(publicKey, signature, "base64url");
    expect(valid).toBe(true);
  });

  it("queries busy time in 30-day chunks across all calendars and merges the results", async () => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.startsWith("https://oauth2")) return json({ access_token: "token-1", expires_in: 3600 });
      const body = JSON.parse(String(init.body));
      return json({
        calendars: {
          primary: { busy: [{ start: body.timeMin, end: body.timeMin }] },
          "studio@grwtee.com": { busy: [] }
        }
      });
    });
    const busy = await queryBusy(new Date("2026-10-01T00:00:00Z"), new Date("2026-12-01T00:00:00Z"));
    const calls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/freeBusy"));
    expect(calls).toHaveLength(3); // 61 days -> 30 + 30 + 1
    const first = JSON.parse(String(calls[0][1].body));
    expect(first.items).toEqual([{ id: "primary" }, { id: "studio@grwtee.com" }]);
    expect(calls[0][1].headers.Authorization).toBe("Bearer token-1");
    expect(busy).toHaveLength(3);
  });

  it("refuses to treat an unreadable calendar as free", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("https://oauth2")
        ? json({ access_token: "token-1", expires_in: 3600 })
        : json({ calendars: { primary: { errors: [{ reason: "notFound" }] } } })
    );
    await expect(queryBusy(new Date("2026-10-01T00:00:00Z"), new Date("2026-10-02T00:00:00Z"))).rejects.toThrow(
      CalendarError
    );
  });

  it("creates the event with a Meet request, the client as guest and invites sent", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("https://oauth2")
        ? json({ access_token: "token-1", expires_in: 3600 })
        : json({ id: "evt1", hangoutLink: "https://meet.google.com/abc-defg-hij" })
    );
    const result = await insertEvent({
      requestId: "booking-1",
      start: new Date("2026-12-01T10:00:00Z"),
      end: new Date("2026-12-01T10:30:00Z"),
      summary: "GRWTEE December consultation: Ada",
      description: "brief",
      attendee: { email: "ada@example.com", name: "Ada" }
    });
    expect(result).toEqual({ id: "evt1", meetUrl: "https://meet.google.com/abc-defg-hij" });
    const [url, init] = fetchMock.mock.calls.find(([u]) => String(u).includes("/events"))!;
    expect(url).toContain("conferenceDataVersion=1");
    expect(url).toContain("sendUpdates=all");
    const body = JSON.parse(String(init.body));
    expect(body.conferenceData.createRequest).toEqual({
      requestId: "booking-1",
      conferenceSolutionKey: { type: "hangoutsMeet" }
    });
    expect(body.attendees).toEqual([{ email: "ada@example.com", displayName: "Ada" }]);
    expect(body.guestsCanSeeOtherGuests).toBe(false);
  });

  it("holds a slot with no guests, then invites the client by patching the event", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("https://oauth2")
        ? json({ access_token: "token-1", expires_in: 3600 })
        : json({ id: "evt2", hangoutLink: "https://meet.google.com/xyz" })
    );
    await insertEvent({
      requestId: "booking-2",
      start: new Date("2026-12-01T10:00:00Z"),
      end: new Date("2026-12-01T10:30:00Z"),
      summary: "Awaiting payment: Ada",
      description: "brief",
      attendee: null
    });
    const [, insertInit] = fetchMock.mock.calls.find(([u]) => String(u).includes("/events"))!;
    expect(JSON.parse(String(insertInit.body)).attendees).toEqual([]);

    fetchMock.mockClear();
    await inviteAttendee("evt2", { summary: "GRWTEE December consultation: Ada", email: "ada@example.com", name: "Ada" });
    const [url, init] = fetchMock.mock.calls.find(([u]) => String(u).includes("/events/evt2"))!;
    expect(url).toContain("sendUpdates=all");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      summary: "GRWTEE December consultation: Ada",
      attendees: [{ email: "ada@example.com", displayName: "Ada" }]
    });
  });

  it("treats an already-deleted event as cancelled, but surfaces other failures", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("https://oauth2") ? json({ access_token: "t", expires_in: 3600 }) : json({}, 410)
    );
    await expect(deleteEvent("gone")).resolves.toBeUndefined();

    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("https://oauth2")
        ? json({ access_token: "t", expires_in: 3600 })
        : json({ error: { message: "Forbidden" } }, 403)
    );
    await expect(deleteEvent("evt1")).rejects.toThrow("Google Calendar 403: Forbidden");
  });
});
