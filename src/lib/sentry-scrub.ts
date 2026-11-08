import type { Breadcrumb, ErrorEvent, NodeOptions } from "@sentry/nextjs";

/**
 * What Sentry gets is cut down to what helps fix the error (OPS-07): no
 * request bodies, cookies or query strings (they carry emails, tokens and
 * booking details), only a few harmless headers, and admins by id only.
 */

const KEEP_HEADERS = new Set(["content-type", "user-agent"]);

function withoutQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // Console lines repeat our own logs, which can name a request's details.
  if (breadcrumb.category === "console") return null;
  const data = breadcrumb.data;
  if (data) {
    for (const key of ["url", "to", "from"]) {
      if (typeof data[key] === "string") data[key] = withoutQuery(data[key] as string);
    }
    delete data["http.query"];
    delete data["http.fragment"];
  }
  return breadcrumb;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const request = event.request;
  if (request) {
    delete request.cookies;
    delete request.data;
    delete request.query_string;
    delete request.env;
    if (request.url) request.url = withoutQuery(request.url);
    if (request.headers) {
      request.headers = Object.fromEntries(
        Object.entries(request.headers).filter(([name]) => KEEP_HEADERS.has(name.toLowerCase()))
      );
    }
  }
  if (event.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => scrubBreadcrumb(b)).filter((b): b is Breadcrumb => b !== null);
  }
  return event;
}

/** Sentry's own collection settings to match: as little about people as it allows. */
export const DATA_COLLECTION: NonNullable<NodeOptions["dataCollection"]> = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: ["content-type", "user-agent"] }, response: false },
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  stackFrameVariables: false
};
