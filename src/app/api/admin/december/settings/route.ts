import { NextResponse } from "next/server";
import { invalidateSlots } from "@/lib/december/booking";
import { saveSettings, settingsSchema } from "@/lib/december/settings";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { requestMeta, writeAuditLog } from "@/lib/security/audit-log";
import { requireAdminSession } from "@/lib/security/session-auth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();
  const parsed = settingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ success: false, error: issue?.message ?? "Invalid settings" }, { status: 400 });
  }
  try {
    await saveSettings(parsed.data);
    invalidateSlots();
    await writeAuditLog({
      adminId: session.user.id,
      action: "december.settings.update",
      metadata: { ...parsed.data },
      ...requestMeta(req)
    });
    return NextResponse.json({ success: true, data: parsed.data });
  } catch (err) {
    console.error("[December admin] Settings save failed", err);
    return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 });
  }
}
