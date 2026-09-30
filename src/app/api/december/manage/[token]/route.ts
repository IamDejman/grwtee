import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelBooking, decemberEnabled, rescheduleBooking, toErrorResponse } from "@/lib/december/booking";

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("reschedule"), slotStart: z.string().datetime() })
]);

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!decemberEnabled()) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  const { token } = await params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  try {
    if (parsed.data.action === "cancel") {
      await cancelBooking(token, siteUrl);
      return NextResponse.json({ success: true, status: "cancelled" });
    }
    const result = await rescheduleBooking(token, parsed.data.slotStart, siteUrl);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
