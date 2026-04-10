import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  vat: boolean;
};

const VAT_RATE = 0.075; // 7.5% (Nigeria default)

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === "USD" ? "$" : "\u20A6"; // ₦
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }
  const paymentAccounts = await prisma.paymentAccount.findMany({
    where: { active: true, currency: invoice.currency },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }]
  });

  let items: LineItem[] = [];
  try {
    items = JSON.parse(invoice.items) as LineItem[];
  } catch {
    items = [];
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 56;

  // Header — "INVOICE" left
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("INVOICE", marginX, y);

  // GRWTEE business info (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("GRWTEE", pageWidth - marginX, y - 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("book@grwtee.com", pageWidth - marginX, y + 4, { align: "right" });

  y += 32;

  // Bill-to block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILL TO", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(invoice.clientName, marginX, y + 14);
  if (invoice.clientAddress) {
    const lines = doc.splitTextToSize(invoice.clientAddress, 240);
    doc.setFontSize(9);
    doc.text(lines, marginX, y + 28);
  }

  // Invoice meta (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const metaX = pageWidth - marginX - 160;
  const metaValX = pageWidth - marginX;
  doc.text("Invoice No.", metaX, y);
  doc.text("Date", metaX, y + 14);
  doc.text("Due Date", metaX, y + 28);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoiceNumber, metaValX, y, { align: "right" });
  doc.text(formatDate(new Date(invoice.createdAt)), metaValX, y + 14, { align: "right" });
  doc.text(formatDate(new Date(invoice.dueDate)), metaValX, y + 28, { align: "right" });

  y += 80;

  // Items table
  const colDesc = marginX;
  const colQty = marginX + 260;
  const colUnit = marginX + 320;
  const colVat = marginX + 400;
  const colAmt = pageWidth - marginX;

  doc.setFillColor(240, 240, 240);
  doc.rect(marginX - 4, y - 12, pageWidth - marginX * 2 + 8, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DESCRIPTION", colDesc, y);
  doc.text("QTY", colQty, y);
  doc.text("UNIT PRICE", colUnit, y);
  doc.text("VAT", colVat, y);
  doc.text("AMOUNT", colAmt, y, { align: "right" });

  y += 18;

  let subtotal = 0;
  let vatTotal = 0;
  doc.setFont("helvetica", "normal");

  for (const item of items) {
    const lineAmount = item.quantity * item.unitPrice;
    const vatAmount = item.vat ? lineAmount * VAT_RATE : 0;
    subtotal += lineAmount;
    vatTotal += vatAmount;

    const descLines = doc.splitTextToSize(item.description, 240);
    doc.text(descLines, colDesc, y);
    doc.text(String(item.quantity), colQty, y);
    doc.text(formatCurrency(item.unitPrice, invoice.currency), colUnit, y);
    doc.text(item.vat ? "Yes" : "No", colVat, y);
    doc.text(formatCurrency(lineAmount, invoice.currency), colAmt, y, { align: "right" });

    y += Math.max(14, descLines.length * 12);
  }

  y += 8;
  doc.setDrawColor(200);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 16;

  // Totals
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const totalsLabelX = pageWidth - marginX - 140;
  doc.text("Subtotal", totalsLabelX, y);
  doc.text(formatCurrency(subtotal, invoice.currency), colAmt, y, { align: "right" });
  y += 14;
  doc.text("VAT (7.5%)", totalsLabelX, y);
  doc.text(formatCurrency(vatTotal, invoice.currency), colAmt, y, { align: "right" });
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL", totalsLabelX, y);
  doc.text(formatCurrency(subtotal + vatTotal, invoice.currency), colAmt, y, { align: "right" });

  y += 32;

  // Status badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const statusText = invoice.status === "paid" ? "PAID" : "UNPAID";
  if (invoice.status === "paid") {
    doc.setTextColor(22, 122, 67);
  } else {
    doc.setTextColor(180, 50, 50);
  }
  doc.text(`Status: ${statusText}`, marginX, y);
  doc.setTextColor(0, 0, 0);

  y += 24;

  // Payment accounts (filtered by invoice currency, active only)
  if (paymentAccounts.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PAYMENT DETAILS", marginX, y);
    y += 14;

    for (const acc of paymentAccounts) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`${acc.label} (${acc.currency})`, marginX, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const lines: string[] = [];
      lines.push(`Bank: ${acc.bankName}`);
      lines.push(`Account Name: ${acc.accountName}`);
      lines.push(`Account Number: ${acc.accountNumber}`);
      if (acc.swiftCode) lines.push(`SWIFT/BIC: ${acc.swiftCode}`);
      if (acc.iban) lines.push(`IBAN: ${acc.iban}`);
      if (acc.sortCode) lines.push(`Sort Code: ${acc.sortCode}`);
      if (acc.notes) lines.push(acc.notes);

      for (const line of lines) {
        const wrapped = doc.splitTextToSize(line, pageWidth - marginX * 2);
        doc.text(wrapped, marginX, y);
        y += wrapped.length * 11;
      }
      y += 6;
    }
    y += 2;
  }

  // Notes
  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NOTES", marginX, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - marginX * 2);
    doc.text(notesLines, marginX, y);
    y += notesLines.length * 12;
  }

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Thank you for your business. Please contact book@grwtee.com for any queries.",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 30,
    { align: "center" }
  );

  const pdfBytes = doc.output("arraybuffer");
  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`
    }
  });
}
