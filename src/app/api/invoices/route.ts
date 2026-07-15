import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { maskInvoiceListItem } from "@/lib/security/pii-mask";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized, jsonGenericServerError } from "@/lib/security/api-response";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
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

async function nextInvoiceNumber(): Promise<string> {
  const last = await prisma.invoice.findFirst({
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true }
  });
  let nextNum = 1;
  if (last?.invoiceNumber) {
    const match = last.invoiceNumber.match(/(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  return `INV-${String(nextNum).padStart(4, "0")}`;
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
    const limit = parseInt(searchParams.get("limit") || "50", 10);
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
        items: JSON.stringify(data.items),
        notes: data.notes ?? null,
        reference: data.reference?.trim() || null,
        dueDate,
        paymentAccountIds: selectedIds.length ? JSON.stringify(selectedIds) : null
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
