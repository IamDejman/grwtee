import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TTL_SECONDS = 300;

function signingSecret(): string {
  return process.env.PDF_SIGNING_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export function createSignedAccessToken(input: {
  resource: string;
  id: string;
  adminId?: string;
  ttlSeconds?: number;
}): { token: string; exp: number } {
  const secret = signingSecret();
  if (!secret) throw new Error("PDF_SIGNING_SECRET or NEXTAUTH_SECRET required");

  const exp = Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS);
  const payload = input.adminId
    ? `${input.resource}:${input.id}:${input.adminId}:${exp}`
    : `${input.resource}:${input.id}:${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return { token: sig, exp };
}

export function verifySignedAccessToken(input: {
  resource: string;
  id: string;
  adminId?: string;
  token: string;
  exp: number;
}): boolean {
  const secret = signingSecret();
  if (!secret) return false;
  if (input.exp < Math.floor(Date.now() / 1000)) return false;

  const payload = input.adminId
    ? `${input.resource}:${input.id}:${input.adminId}:${input.exp}`
    : `${input.resource}:${input.id}:${input.exp}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(input.token));
  } catch {
    return false;
  }
}

export function buildSignedUrl(path: string, token: string, exp: number): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}sig=${encodeURIComponent(token)}&exp=${exp}`;
}
