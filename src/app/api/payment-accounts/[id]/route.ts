import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStepUp } from "@/lib/security/step-up";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";
import { jsonGenericServerError, jsonUnauthorized } from "@/lib/security/api-response";
import { encryptPaymentAccountInput, decryptPaymentAccount } from "@/lib/security/payment-account-crypto";
import { requireAdminSession } from "@/lib/security/session-auth";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  type: z.enum(["bank", "paypal", "wise", "other"]).optional(),
  currency: z.enum(["NGN", "USD", "GBP", "EUR"]).optional(),
  bankName: z.string().optional().nullable(),
  accountName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  swiftCode: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  sortCode: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  currentPassword: z.string().min(1)
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session?.user?.email || !session.user.id) {
    return jsonUnauthorized();
  }

  const { id } = await params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const stepUp = await requireStepUp(session.user.email, parsed.data.currentPassword);
  if (!stepUp.ok) {
    return NextResponse.json({ success: false, error: stepUp.message }, { status: 403 });
  }

  const { currentPassword: _ignored, ...updateData } = parsed.data;

  try {
    const data = await prisma.paymentAccount.update({
      where: { id },
      data: encryptPaymentAccountInput(updateData)
    });

    const meta = requestMeta(req);
    await writeAuditLog({
      adminId: session.user.id,
      action: "payment_account.update",
      resource: id,
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    return NextResponse.json({ success: true, data: decryptPaymentAccount(data) });
  } catch (err) {
    console.error("[PaymentAccount PUT]", err);
    return jsonGenericServerError("payment-account-put");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session?.user?.email || !session.user.id) {
    return jsonUnauthorized();
  }

  const { id } = await params;
  let currentPassword: string | undefined;
  try {
    const json = await req.json();
    currentPassword = z.object({ currentPassword: z.string().min(1) }).parse(json).currentPassword;
  } catch {
    return NextResponse.json(
      { success: false, error: "Current password required for this action" },
      { status: 400 }
    );
  }

  const stepUp = await requireStepUp(session.user.email, currentPassword);
  if (!stepUp.ok) {
    return NextResponse.json({ success: false, error: stepUp.message }, { status: 403 });
  }

  try {
    await prisma.paymentAccount.delete({ where: { id } });
    const meta = requestMeta(req);
    await writeAuditLog({
      adminId: session.user.id,
      action: "payment_account.delete",
      resource: id,
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PaymentAccount DELETE]", err);
    return jsonGenericServerError("payment-account-delete");
  }
}
