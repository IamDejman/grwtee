import { createSign } from "crypto";
import type { BusyRange } from "./availability";

/**
 * Google Calendar over REST, signed in as a Workspace service account with domain-wide
 * delegation that impersonates one mailbox (book@grwtee.com). No SDK: a signed JWT is
 * exchanged for an access token, which is cached until shortly before it expires.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy"
];
const FREEBUSY_CHUNK_DAYS = 30;

export class CalendarError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "CalendarError";
  }
}

interface CalendarConfig {
  clientEmail: string;
  privateKey: string;
  subject: string;
  busyCalendars: string[];
}

export function calendarConfig(): CalendarConfig | null {
  const clientEmail = process.env.GOOGLE_SA_EMAIL;
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  const extra = (process.env.DECEMBER_BUSY_CALENDARS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    clientEmail,
    privateKey,
    subject: process.env.GOOGLE_CALENDAR_SUBJECT || "book@grwtee.com",
    busyCalendars: ["primary", ...extra]
  };
}

function requireConfig(): CalendarConfig {
  const config = calendarConfig();
  if (!config) throw new CalendarError("Google Calendar is not configured");
  return config;
}

/** RS256 JWT for the OAuth 2.0 JWT bearer grant. Exported for tests. */
export function signServiceAccountJwt(config: Pick<CalendarConfig, "clientEmail" | "privateKey" | "subject">, nowSeconds: number): string {
  const encode = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: config.clientEmail,
    sub: config.subject,
    scope: SCOPES.join(" "),
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey, "base64url");
  return `${unsigned}.${signature}`;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const assertion = signServiceAccountJwt(requireConfig(), Math.floor(Date.now() / 1000));
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) {
    // "unauthorized_client" here almost always means domain-wide delegation is missing a scope.
    throw new CalendarError(`Google token request failed: ${json.error ?? res.status}`, res.status);
  }
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

async function call<T>(path: string, init: RequestInit & { allowStatus?: number[] } = {}): Promise<T | null> {
  const { allowStatus = [], ...rest } = init;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", ...rest.headers }
  });
  if (allowStatus.includes(res.status)) return null;
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new CalendarError(`Google Calendar ${res.status}: ${body.error?.message ?? res.statusText}`, res.status);
  }
  return res.status === 204 ? null : ((await res.json()) as T);
}

interface FreeBusyResponse {
  calendars: Record<string, { busy?: BusyRange[]; errors?: { reason: string }[] }>;
}

/** Busy ranges across the booking calendar and any extra calendars, split into 30-day queries. */
export async function queryBusy(from: Date, to: Date): Promise<BusyRange[]> {
  const { busyCalendars } = requireConfig();
  const chunks: [Date, Date][] = [];
  for (let t = from.getTime(); t < to.getTime(); t += FREEBUSY_CHUNK_DAYS * 86_400_000) {
    chunks.push([new Date(t), new Date(Math.min(t + FREEBUSY_CHUNK_DAYS * 86_400_000, to.getTime()))]);
  }
  const results = await Promise.all(
    chunks.map(([timeMin, timeMax]) =>
      call<FreeBusyResponse>("/freeBusy", {
        method: "POST",
        body: JSON.stringify({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: busyCalendars.map((id) => ({ id }))
        })
      })
    )
  );
  const busy: BusyRange[] = [];
  for (const result of results) {
    for (const [id, cal] of Object.entries(result?.calendars ?? {})) {
      // A calendar we can't read must not look free.
      if (cal.errors?.length) throw new CalendarError(`Cannot read calendar ${id}: ${cal.errors[0].reason}`);
      busy.push(...(cal.busy ?? []));
    }
  }
  return busy;
}

interface GoogleEvent {
  id: string;
  hangoutLink?: string;
}

export async function insertEvent(input: {
  requestId: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  attendeeEmail: string;
  attendeeName: string;
}): Promise<{ id: string; meetUrl: string | null }> {
  const event = await call<GoogleEvent>("/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", {
    method: "POST",
    body: JSON.stringify({
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.start.toISOString(), timeZone: "Africa/Lagos" },
      end: { dateTime: input.end.toISOString(), timeZone: "Africa/Lagos" },
      attendees: [{ email: input.attendeeEmail, displayName: input.attendeeName }],
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: false,
      conferenceData: {
        createRequest: { requestId: input.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } }
      }
    })
  });
  if (!event) throw new CalendarError("Google Calendar returned no event");
  return { id: event.id, meetUrl: event.hangoutLink ?? null };
}

export async function moveEvent(eventId: string, start: Date, end: Date): Promise<void> {
  await call(`/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: "PATCH",
    body: JSON.stringify({
      start: { dateTime: start.toISOString(), timeZone: "Africa/Lagos" },
      end: { dateTime: end.toISOString(), timeZone: "Africa/Lagos" }
    })
  });
}

/** Deletes and notifies the guest. Already-deleted events count as success. */
export async function deleteEvent(eventId: string): Promise<void> {
  await call(`/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: "DELETE",
    allowStatus: [404, 410]
  });
}
