import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  label: z.string().min(1),
  currency: z.enum(["NGN", "USD"]),
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  swiftCode: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  sortCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
  order: z.number().int().optional()
});

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
    const created = await prisma.paymentAccount.create({
      data: {
        label: data.label,
        currency: data.currency,
        bankName: data.bankName,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        swiftCode: data.swiftCode || null,
        iban: data.iban || null,
        sortCode: data.sortCode || null,
        notes: data.notes || null,
        active: data.active ?? true,
        order: nextOrder
      }
    });
    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error("[PaymentAccounts POST]", err);
    return NextResponse.json(
      { success: false, error: "Failed to create account" },
      { status: 500 }
    );
  }
}
