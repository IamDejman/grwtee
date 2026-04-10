import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { readFileSync } from "fs";
import path from "path";

// Run this route on Node.js (jsPDF + fs need it, not Edge runtime)
export const runtime = "nodejs";

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  vat: boolean;
};

const VAT_RATE = 0.075; // 7.5% (Nigeria default)

// Currency rendering in the PDF.
// jsPDF's built-in Helvetica uses WinAnsi encoding which does NOT include the
// Naira (₦, U+20A6) glyph — it renders as a broken "¦" character. To stay
// 100% safe for all currencies we emit the ISO code (NGN, USD, GBP, EUR) as a
// text prefix instead of a symbol. This works for every Helvetica glyph on
// every platform without embedding a custom TTF.
function formatCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// Totals are the same format; kept as a separate helper so we can tweak the
// totals row independently later if needed.
const formatTotal = formatCurrency;

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Read a site setting (key/value table) once per request.
async function getSetting(key: string): Promise<string> {
  const row = await prisma.siteSettings.findUnique({ where: { key } });
  return row?.value?.trim() || "";
}

// Load the logo from /public/logo.png. Returns null if the file isn't present
// so the PDF gracefully falls back to a text header.
function loadLogoDataUrl(): { dataUrl: string; width: number; height: number } | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const buf = readFileSync(logoPath);
    const base64 = buf.toString("base64");
    return {
      dataUrl: `data:image/png;base64,${base64}`,
      // Native dimensions of public/logo.png (2787 x 517). We scale this to
      // fit the header; aspect ratio is preserved by jsPDF if we compute it.
      width: 2787,
      height: 517
    };
  } catch (e) {
    console.warn("[Invoice PDF] Failed to load logo:", e);
    return null;
  }
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

  // Load business settings once
  const [businessName, businessEmail, businessAddress, businessVatNumber, footerTerms] =
    await Promise.all([
      getSetting("invoiceBusinessName"),
      getSetting("contactEmail"),
      getSetting("invoiceBusinessAddress"),
      getSetting("invoiceVatNumber"),
      getSetting("invoiceFooterTerms")
    ]);

  const resolvedName = businessName || "GRWTEE";
  const resolvedEmail = businessEmail || "book@grwtee.com";

  let selectedAccountIds: string[] = [];
  if (invoice.paymentAccountIds) {
    try {
      const parsed = JSON.parse(invoice.paymentAccountIds);
      if (Array.isArray(parsed))
        selectedAccountIds = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      selectedAccountIds = [];
    }
  }
  const paymentAccounts = await prisma.paymentAccount.findMany({
    where: selectedAccountIds.length
      ? { id: { in: selectedAccountIds } }
      : { active: true, currency: invoice.currency },
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
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  let y = 56;

  // ---------- Header row ----------
  // Left: "INVOICE" heading. Right: logo (if available) above business info.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("INVOICE", marginX, y);

  const rightEdge = pageWidth - marginX;
  let rightY = y - 14;

  const logo = loadLogoDataUrl();
  if (logo) {
    // Fit logo within a max width of 120pt, preserving aspect ratio
    const maxLogoWidth = 120;
    const aspect = logo.width / logo.height;
    const drawWidth = Math.min(maxLogoWidth, 120);
    const drawHeight = drawWidth / aspect;
    try {
      doc.addImage(
        logo.dataUrl,
        "PNG",
        rightEdge - drawWidth,
        rightY - drawHeight + 10,
        drawWidth,
        drawHeight
      );
    } catch (e) {
      console.warn("[Invoice PDF] addImage failed:", e);
    }
    rightY += 14;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(resolvedName, rightEdge, rightY + 10, { align: "right" });
    rightY += 18;
  }

  // Business address + email + VAT number, right-aligned under logo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  let rightCursor = rightY + 18;
  if (businessAddress) {
    const addrLines = doc.splitTextToSize(businessAddress, 220);
    for (const line of addrLines) {
      doc.text(line, rightEdge, rightCursor, { align: "right" });
      rightCursor += 11;
    }
  }
  doc.text(resolvedEmail, rightEdge, rightCursor, { align: "right" });
  rightCursor += 11;
  if (businessVatNumber) {
    doc.text(`VAT Number: ${businessVatNumber}`, rightEdge, rightCursor, {
      align: "right"
    });
    rightCursor += 11;
  }
  doc.setTextColor(0, 0, 0);

  // Move the main cursor below whichever side is taller
  y = Math.max(y + 40, rightCursor + 10);

  // ---------- Bill-to block (left) ----------
  const billBlockY = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILL TO", marginX, billBlockY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(invoice.clientName, marginX, billBlockY + 14);
  if (invoice.clientAddress) {
    const lines = doc.splitTextToSize(invoice.clientAddress, 240);
    doc.setFontSize(9);
    doc.text(lines, marginX, billBlockY + 28);
  }

  // ---------- Invoice meta (right) ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const metaX = pageWidth - marginX - 160;
  const metaValX = pageWidth - marginX;
  const metaLines: Array<[string, string]> = [
    ["Invoice No.", invoice.invoiceNumber],
    ["Date", formatDate(new Date(invoice.createdAt))]
  ];
  if (invoice.reference) metaLines.push(["Reference", invoice.reference]);

  let metaY = billBlockY;
  for (const [label, value] of metaLines) {
    doc.setFont("helvetica", "bold");
    doc.text(label, metaX, metaY);
    doc.setFont("helvetica", "normal");
    doc.text(value, metaValX, metaY, { align: "right" });
    metaY += 14;
  }

  y = Math.max(billBlockY + 60, metaY + 20);

  // ---------- Items table ----------
  const colDesc = marginX;
  const colQty = marginX + 260;
  const colUnit = marginX + 320;
  const colVat = marginX + 420;
  const colAmt = pageWidth - marginX;

  doc.setFillColor(240, 240, 240);
  doc.rect(marginX - 4, y - 12, pageWidth - marginX * 2 + 8, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DESCRIPTION", colDesc, y);
  doc.text("QTY", colQty, y);
  doc.text("UNIT PRICE", colUnit, y);
  doc.text("VAT", colVat, y);
  doc.text(`AMOUNT (${invoice.currency})`, colAmt, y, { align: "right" });

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

  // ---------- Totals ----------
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const totalsLabelX = pageWidth - marginX - 160;
  doc.text("Subtotal", totalsLabelX, y);
  doc.text(formatCurrency(subtotal, invoice.currency), colAmt, y, { align: "right" });
  y += 14;
  if (vatTotal > 0) {
    doc.text("VAT (7.5%)", totalsLabelX, y);
    doc.text(formatCurrency(vatTotal, invoice.currency), colAmt, y, { align: "right" });
    y += 14;
  }
  y += 4;
  doc.setDrawColor(180);
  doc.line(totalsLabelX, y - 2, pageWidth - marginX, y - 2);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`TOTAL ${invoice.currency}`, totalsLabelX, y);
  doc.text(formatTotal(subtotal + vatTotal, invoice.currency), colAmt, y, { align: "right" });

  y += 32;

  // ---------- Due date (bold, above payment details) ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Due Date: ${formatDate(new Date(invoice.dueDate))}`, marginX, y);
  y += 20;

  // ---------- Payment accounts ----------
  if (paymentAccounts.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PAYMENT DETAILS", marginX, y);
    y += 14;

    for (const acc of paymentAccounts) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const typeLabel =
        acc.type === "paypal"
          ? "PayPal"
          : acc.type === "wise"
            ? "Wise"
            : acc.type === "other"
              ? "Other"
              : "Bank";
      doc.text(`${acc.label} — ${typeLabel} (${acc.currency})`, marginX, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const lines: string[] = [];
      if (acc.type === "bank") {
        if (acc.bankName) lines.push(`Bank: ${acc.bankName}`);
        if (acc.accountName) lines.push(`Account Name: ${acc.accountName}`);
        if (acc.accountNumber) lines.push(`Account Number: ${acc.accountNumber}`);
        if (acc.swiftCode) lines.push(`SWIFT/BIC: ${acc.swiftCode}`);
        if (acc.iban) lines.push(`IBAN: ${acc.iban}`);
        if (acc.sortCode) lines.push(`Sort Code: ${acc.sortCode}`);
      } else if (acc.type === "paypal") {
        if (acc.email) lines.push(`PayPal: ${acc.email}`);
      } else if (acc.type === "wise") {
        if (acc.email) lines.push(`Wise: ${acc.email}`);
      }
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

  // ---------- Notes ----------
  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NOTES", marginX, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - marginX * 2);
    doc.text(notesLines, marginX, y);
    y += notesLines.length * 12 + 6;
  }

  // ---------- Footer terms (from site settings) ----------
  if (footerTerms) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    const termsLines = doc.splitTextToSize(footerTerms, pageWidth - marginX * 2);
    // Make sure we don't overlap the very bottom footer
    const maxY = pageHeight - 50;
    for (const line of termsLines) {
      if (y > maxY) break;
      doc.text(line, marginX, y);
      y += 10;
    }
    doc.setTextColor(0, 0, 0);
  }

  // ---------- Bottom footer (always) ----------
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Thank you for your business. Please contact ${resolvedEmail} for any queries.`,
    pageWidth / 2,
    pageHeight - 30,
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
