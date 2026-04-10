import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

// Common fields shared by every account type
const commonFields = {
  label: z.string().min(1),
  currency: z.enum(["NGN", "USD", "GBP", "EUR"]),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
  order: z.number().int().optional()
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
  // "other" just uses notes for freeform instructions
  notes: z.string().min(1)
});

const createSchema = z.discriminatedUnion("type", [
  bankSchema,
  paypalSchema,
  wiseSchema,
  otherSchema
]);

async function requireAdmin() {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await prisma.paymentAccount.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }]
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[PaymentAccounts GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to load accounts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  try {
    const max = await prisma.paymentAccount.aggregate({ _max: { order: true } });
    const nextOrder = data.order ?? (max._max.order ?? 0) + 1;

    // Build the create payload based on type
    const createData = {
      label: data.label,
      type: data.type,
      currency: data.currency,
      notes: data.notes || null,
      active: data.active ?? true,
      order: nextOrder,
      // Bank fields (null for non-bank)
      bankName: data.type === "bank" ? data.bankName : null,
      accountName: data.type === "bank" ? data.accountName : null,
      accountNumber: data.type === "bank" ? data.accountNumber : null,
      swiftCode: data.type === "bank" ? data.swiftCode || null : null,
      iban: data.type === "bank" ? data.iban || null : null,
      sortCode: data.type === "bank" ? data.sortCode || null : null,
      // Email-based fields
      email: data.type === "paypal" || data.type === "wise" ? data.email : null
    };

    const created = await prisma.paymentAccount.create({ data: createData });
    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error("[PaymentAccounts POST]", err);
    return NextResponse.json(
      { success: false, error: "Failed to create account" },
      { status: 500 }
    );
  }
}
