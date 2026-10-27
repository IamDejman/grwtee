import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStepUp } from "@/lib/security/step-up";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { currentKeyId, isEncryptionEnabled } from "@/lib/security/field-encryption";
import { reencryptStoredSecrets, reencryptionStatus } from "@/lib/security/reencrypt";
import { requireAdminSession } from "@/lib/security/session-auth";

const schema = z.object({
  currentPassword: z.string().min(1)
});

/** GET: whether a key is set and how many stored values aren't under it yet. */
export async function GET() {
  const session = await requireAdminSession();
  if (!session?.user?.id) return jsonUnauthorized();
  if (!isEncryptionEnabled()) {
    return NextResponse.json({ success: true, data: { enabled: false, keyId: null, toUpdate: 0, unreadable: 0 } });
  }
  const status = await reencryptionStatus();
  return NextResponse.json({ success: true, data: { enabled: true, keyId: currentKeyId(), ...status } });
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.email || !session.user.id) {
    return jsonUnauthorized();
  }

  if (!isEncryptionEnabled()) {
    return NextResponse.json(
      { success: false, error: "Set DATA_ENCRYPTION_KEY before re-encrypting payment data." },
      { status: 400 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const stepUp = await requireStepUp(session.user.email, parsed.data.currentPassword);
  if (!stepUp.ok) {
    return NextResponse.json({ success: false, error: stepUp.message }, { status: 403 });
  }

  const summary = await reencryptStoredSecrets();
  const updated = summary.updated.paymentAccounts + summary.updated.mfaSecrets;
  const unreadable = summary.unreadable.paymentAccounts + summary.unreadable.mfaSecrets;

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: session.user.id,
    action: "payment_account.reencrypt",
    resource: "payment_accounts",
    metadata: { ...summary, keyId: currentKeyId() },
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return NextResponse.json({
    success: true,
    data: { updated, unreadable, total: summary.totalPaymentAccounts }
  });
}
