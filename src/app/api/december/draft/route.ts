import { NextResponse } from "next/server";
import { decemberEnabled } from "@/lib/december/booking";
import { saveDraft } from "@/lib/december/drafts";
import { requestMeta } from "@/lib/security/audit-log";

export const dynamic = "force-dynamic";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_SAVES = 40;
const recent = new Map<string, { count: number; firstAt: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  const prev = recent.get(ip);
  if (!prev || now - prev.firstAt > WINDOW_MS) {
    recent.set(ip, { count: 1, firstAt: now });
    return false;
  }
  prev.count++;
  return prev.count > MAX_SAVES;
}

export async function POST(req: Request) {
  if (!decemberEnabled()) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (limited(requestMeta(req).ip ?? "unknown")) {
    return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const ok = await saveDraft(json);
    return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
  } catch (err) {
    console.error("[December] Draft save failed", err);
    return NextResponse.json({ success: false, error: "Could not save" }, { status: 500 });
  }
}
