import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

// Partial update schema — all fields optional since this is a PATCH-style PUT.
// We don't re-validate discriminated unions here because the UI sends the full
// record on edit; per-field updates (like toggling `active`) only send that field.
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
  order: z.number().int().optional()
});

async function requireAdmin() {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) return null;
  return session;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const data = await prisma.paymentAccount.update({
      where: { id },
      data: parsed.data
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[PaymentAccount PUT]", err);
    return NextResponse.json(
      { success: false, error: "Failed to update account" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.paymentAccount.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Account deleted" });
  } catch (err) {
    console.error("[PaymentAccount DELETE]", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
