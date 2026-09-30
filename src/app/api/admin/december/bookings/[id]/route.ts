import { NextResponse } from "next/server";
import { z } from "zod";
import { adminCancelBooking, setPaid, toErrorResponse } from "@/lib/december/booking";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { requestMeta, writeAuditLog } from "@/lib/security/audit-log";
import { requireAdminSession } from "@/lib/security/session-auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ action: z.enum(["paid", "unpaid", "cancel"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });

  try {
    const { action } = parsed.data;
    const booking = action === "cancel" ? await adminCancelBooking(id) : await setPaid(id, action === "paid");
    await writeAuditLog({
      adminId: session.user.id,
      action: `december.booking.${action}`,
      resource: id,
      ...requestMeta(req)
    });
    return NextResponse.json({ success: true, data: { status: booking.status, paidAt: booking.paidAt } });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
