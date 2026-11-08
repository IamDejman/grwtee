import { NextResponse } from "next/server";
import { z } from "zod";
import { releaseUnpaidHolds } from "@/lib/december/booking";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { requestMeta, writeAuditLog } from "@/lib/security/audit-log";
import { requireAdminSession } from "@/lib/security/session-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(500) });

/** POST { ids }: releases these unpaid holds at once (see releaseUnpaidHolds). */
export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });

  const result = await releaseUnpaidHolds(parsed.data.ids);
  await writeAuditLog({
    adminId: session.user.id,
    action: "december.holds.release",
    metadata: { requested: parsed.data.ids.length, ...result },
    ...requestMeta(req)
  });
  return NextResponse.json({ success: true, data: result });
}
