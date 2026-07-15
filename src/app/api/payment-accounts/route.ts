import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStepUp } from "@/lib/security/step-up";
import { writeAuditLog, requestMeta } from "@/lib/security/audit-log";
import { jsonGenericServerError, jsonUnauthorized } from "@/lib/security/api-response";
import { encryptPaymentAccountInput, decryptPaymentAccount, decryptPaymentAccounts } from "@/lib/security/payment-account-crypto";
import { requireAdminSession } from "@/lib/security/session-auth";

const commonFields = {
  label: z.string().min(1),
  currency: z.enum(["NGN", "USD", "GBP", "EUR"]),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  currentPassword: z.string().min(1)
};

const bankSchema = z.object({
  ...commonFields,
  type: z.literal("bank"),
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  swiftCode: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  sortCode: z.string().optional().nullable()
});

const paypalSchema = z.object({
  ...commonFields,
  type: z.literal("paypal"),
  email: z.string().email()
});

const wiseSchema = z.object({
  ...commonFields,
  type: z.literal("wise"),
  email: z.string().email()
});

const otherSchema = z.object({
  ...commonFields,
  type: z.literal("other"),
  notes: z.string().min(1)
});

const createSchema = z.discriminatedUnion("type", [
  bankSchema,
  paypalSchema,
  wiseSchema,
  otherSchema
]);

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
  }
  try {
    const data = await prisma.paymentAccount.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }]
    });
    return NextResponse.json({ success: true, data: decryptPaymentAccounts(data) });
  } catch (err) {
    console.error("[PaymentAccounts GET]", err);
    return jsonGenericServerError("payment-accounts-get");
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.email || !session.user.id) {
    return jsonUnauthorized();
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }

  const stepUp = await requireStepUp(session.user.email, parsed.data.currentPassword);
  if (!stepUp.ok) {
    return NextResponse.json({ success: false, error: stepUp.message }, { status: 403 });
  }

  const data = parsed.data;
  try {
    const max = await prisma.paymentAccount.aggregate({ _max: { order: true } });
    const nextOrder = data.order ?? (max._max.order ?? 0) + 1;

    const { currentPassword: _cp, ...rawData } = data;
    const createData = encryptPaymentAccountInput({
      label: rawData.label,
      type: rawData.type,
      currency: rawData.currency,
      notes: rawData.notes || null,
      active: rawData.active ?? true,
      order: nextOrder,
      bankName: rawData.type === "bank" ? rawData.bankName : null,
      accountName: rawData.type === "bank" ? rawData.accountName : null,
      accountNumber: rawData.type === "bank" ? rawData.accountNumber : null,
      swiftCode: rawData.type === "bank" ? rawData.swiftCode || null : null,
      iban: rawData.type === "bank" ? rawData.iban || null : null,
      sortCode: rawData.type === "bank" ? rawData.sortCode || null : null,
      email: rawData.type === "paypal" || rawData.type === "wise" ? rawData.email : null
    });

    const created = await prisma.paymentAccount.create({ data: createData });
    const meta = requestMeta(req);
    await writeAuditLog({
      adminId: session.user.id,
      action: "payment_account.create",
      resource: created.id,
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    return NextResponse.json({ success: true, data: decryptPaymentAccount(created) });
  } catch (err) {
    console.error("[PaymentAccounts POST]", err);
    return jsonGenericServerError("payment-accounts-post");
  }
}
