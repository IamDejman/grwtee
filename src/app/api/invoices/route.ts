import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { maskInvoiceListItem } from "@/lib/security/pii-mask";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized, jsonGenericServerError } from "@/lib/security/api-response";
import { clampLimit } from "@/lib/utils";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  // Kept to the cent: the totals are worked out in whole cents.
  unitPrice: z.number().nonnegative().transform((n) => Math.round(n * 100) / 100),
  vat: z.boolean().default(false)
});

const createSchema = z.object({
  clientName: z.string().min(1),
  clientAddress: z.string().optional().nullable(),
  currency: z.enum(["NGN", "USD"]).default("NGN"),
  items: z.array(lineItemSchema).min(1),
  notes: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  dueDate: z.string().min(1),
  paymentAccountIds: z.array(z.string()).optional().nullable()
});

// From a database sequence: never reused after a delete, and two invoices
// made at the same moment get different numbers (WEB-20).
async function nextInvoiceNumber(): Promise<string> {
  const [row] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT nextval('"invoice_number_seq"') AS n`;
  return `INV-${String(row.n).padStart(4, "0")}`;
}

export async function GET(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return jsonUnauthorized();
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const full = searchParams.get("full") === "1";
    const limit = clampLimit(searchParams.get("limit"), 50, 200);
    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;
    const rows = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit
    });
    const data = full ? rows : rows.map(maskInvoiceListItem);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[Invoices GET]", err);
    return jsonGenericServerError("invoices-get");
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return jsonUnauthorized();
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
  const dueDate = new Date(data.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ success: false, error: "Invalid due date" }, { status: 400 });
  }
  try {
    const invoiceNumber = await nextInvoiceNumber();
    const selectedIds = data.paymentAccountIds?.filter((id) => id && id.length > 0) ?? [];
    const created = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientName: data.clientName,
        clientAddress: data.clientAddress ?? null,
        currency: data.currency,
        items: data.items,
        notes: data.notes ?? null,
        reference: data.reference?.trim() || null,
        dueDate,
        paymentAccountIds: selectedIds.length ? selectedIds : Prisma.DbNull
      }
    });
    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error("[Invoices POST]", err);
    return NextResponse.json(
      { success: false, error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
