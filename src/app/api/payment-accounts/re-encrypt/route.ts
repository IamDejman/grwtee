import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStepUp } from "@/lib/security/step-up";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { isEncryptionEnabled } from "@/lib/security/field-encryption";
import {
  paymentAccountNeedsReencryption,
  reencryptPaymentAccountFields
} from "@/lib/security/payment-account-crypto";
import { requireAdminSession } from "@/lib/security/session-auth";

const schema = z.object({
  currentPassword: z.string().min(1)
});

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

  const accounts = await prisma.paymentAccount.findMany();
  let updated = 0;

  for (const account of accounts) {
    if (!paymentAccountNeedsReencryption(account)) continue;
    const fields = reencryptPaymentAccountFields(account);
    await prisma.paymentAccount.update({
      where: { id: account.id },
      data: fields
    });
    updated += 1;
  }

  const meta = requestMeta(req);
  await writeAuditLog({
    adminId: session.user.id,
    action: "payment_account.reencrypt",
    resource: "payment_accounts",
    metadata: { updated, total: accounts.length },
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  return NextResponse.json({
    success: true,
    data: { updated, total: accounts.length, skipped: accounts.length - updated }
  });
}
