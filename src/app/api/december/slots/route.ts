import { NextResponse } from "next/server";
import { bookingMode, decemberEnabled, openSlots, toErrorResponse } from "@/lib/december/booking";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!decemberEnabled()) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  const mode = bookingMode();
  if (mode === "off") return NextResponse.json({ success: true, mode, days: [] });
  try {
    const days = await openSlots();
    return NextResponse.json({ success: true, mode, days }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
