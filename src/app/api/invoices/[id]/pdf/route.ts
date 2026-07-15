import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { readFileSync } from "fs";
import path from "path";
import { requireAdminSession } from "@/lib/security/session-auth";
import { verifySignedAccessToken } from "@/lib/security/signed-access";
import { decryptPaymentAccounts } from "@/lib/security/payment-account-crypto";

// Run this route on Node.js (jsPDF + fs need it, not Edge runtime).
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
// Naira (₦, U+20A6) glyph — it renders as a broken "¦" character. We avoid
// symbols entirely and rely on column headers / labels to carry the currency
// code. formatAmount prints just the number (with thousands separators and 2
// decimal places); formatCurrencyWithCode prepends the ISO code for contexts
// where the column is unlabeled.
function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatCurrencyWithCode(amount: number, currency: string) {
  return `${currency} ${formatAmount(amount)}`;
}

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
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const sig = url.searchParams.get("sig");
  const exp = url.searchParams.get("exp");

  let authorized = false;
  if (sig && exp) {
    authorized = verifySignedAccessToken({
      resource: "invoice-pdf",
      id,
      token: sig,
      exp: parseInt(exp, 10)
    });
  }

  if (!authorized) {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

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
  const paymentAccounts = decryptPaymentAccounts(
    await prisma.paymentAccount.findMany({
      where: selectedAccountIds.length
        ? { id: { in: selectedAccountIds } }
        : { active: true, currency: invoice.currency },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }]
    })
  );

  let items: LineItem[] = [];
  try {
    items = JSON.parse(invoice.items) as LineItem[];
  } catch {
    items = [];
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  let y = 64;

  // ---------- Header row ----------
  // Left: "INVOICE" heading. Right: logo (if available) above business info.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("INVOICE", marginX, y);

  const rightEdge = pageWidth - marginX;
  const logoTop = y - 24;
  let rightCursor = y;

  const logo = loadLogoDataUrl();
  if (logo) {
    // Fit logo within a max width of 140pt, preserving aspect ratio
    const maxLogoWidth = 140;
    const aspect = logo.width / logo.height;
    const drawWidth = Math.min(maxLogoWidth, 140);
    const drawHeight = drawWidth / aspect;
    try {
      doc.addImage(
        logo.dataUrl,
        "PNG",
        rightEdge - drawWidth,
        logoTop,
        drawWidth,
        drawHeight
      );
      rightCursor = logoTop + drawHeight + 18;
    } catch (e) {
      console.warn("[Invoice PDF] addImage failed:", e);
      rightCursor = y + 8;
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(resolvedName, rightEdge, y - 6, { align: "right" });
    rightCursor = y + 12;
  }

  // Business address + email + VAT number, right-aligned under logo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  if (businessAddress) {
    const addrLines = doc.splitTextToSize(businessAddress, 220);
    for (const line of addrLines) {
      doc.text(line, rightEdge, rightCursor, { align: "right" });
      rightCursor += 12;
    }
  }
  doc.text(resolvedEmail, rightEdge, rightCursor, { align: "right" });
  rightCursor += 12;
  if (businessVatNumber) {
    doc.text(`VAT Number: ${businessVatNumber}`, rightEdge, rightCursor, {
      align: "right"
    });
    rightCursor += 12;
  }
  doc.setTextColor(0, 0, 0);

  // Move the main cursor below whichever side is taller, with extra padding
  y = Math.max(y + 48, rightCursor + 24);

  // ---------- Bill-to block (left) ----------
  const billBlockY = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("BILL TO", marginX, billBlockY);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(invoice.clientName, marginX, billBlockY + 16);
  let billCursor = billBlockY + 16;
  if (invoice.clientAddress) {
    const lines = doc.splitTextToSize(invoice.clientAddress, 240);
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    let addrY = billBlockY + 32;
    for (const line of lines) {
      doc.text(line, marginX, addrY);
      addrY += 13;
    }
    billCursor = addrY;
    doc.setTextColor(0, 0, 0);
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
    doc.setTextColor(80, 80, 80);
    doc.text(label, metaX, metaY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(value, metaValX, metaY, { align: "right" });
    metaY += 16;
  }

  y = Math.max(billCursor + 40, metaY + 32);

  // ---------- Items table ----------
  // A4 usable width = 595 - 48*2 = 499pt. Column layout (x positions):
  //   DESCRIPTION      QTY       UNIT PRICE    AMOUNT (NGN)
  //   left             right     right         right
  // No per-line VAT column — VAT is applied at the invoice level and the
  // totals row already shows it when non-zero. Per-line VAT status was
  // overlapping the AMOUNT column at A4 width, so it was removed.
  const colDescLeft = marginX;
  const colQtyRight = marginX + 310;
  const colUnitRight = marginX + 410;
  const colAmtRight = pageWidth - marginX;
  const descMaxWidth = 250;

  // Header band
  doc.setFillColor(244, 244, 244);
  doc.rect(marginX - 4, y - 14, pageWidth - marginX * 2 + 8, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("DESCRIPTION", colDescLeft, y);
  doc.text("QTY", colQtyRight, y, { align: "right" });
  doc.text("UNIT PRICE", colUnitRight, y, { align: "right" });
  doc.text(`AMOUNT (${invoice.currency})`, colAmtRight, y, { align: "right" });
  doc.setTextColor(0, 0, 0);

  y += 24; // breathing room after header

  let subtotal = 0;
  let vatTotal = 0;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const item of items) {
    const lineAmount = item.quantity * item.unitPrice;
    const vatAmount = item.vat ? lineAmount * VAT_RATE : 0;
    subtotal += lineAmount;
    vatTotal += vatAmount;

    const descLines = doc.splitTextToSize(item.description, descMaxWidth);
    doc.text(descLines, colDescLeft, y);
    doc.text(String(item.quantity), colQtyRight, y, { align: "right" });
    doc.text(formatAmount(item.unitPrice), colUnitRight, y, { align: "right" });
    doc.text(formatAmount(lineAmount), colAmtRight, y, { align: "right" });

    y += Math.max(18, descLines.length * 14);
  }

  y += 10;
  doc.setDrawColor(210);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  // ---------- Totals ----------
  // Labels right-aligned to totalsLabelX; amounts right-aligned to colAmtRight.
  // Clear horizontal gap between label and amount for readability.
  const totalsLabelX = pageWidth - marginX - 130;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal", totalsLabelX, y, { align: "right" });
  doc.text(formatAmount(subtotal), colAmtRight, y, { align: "right" });
  y += 16;
  if (vatTotal > 0) {
    doc.text("VAT (7.5%)", totalsLabelX, y, { align: "right" });
    doc.text(formatAmount(vatTotal), colAmtRight, y, { align: "right" });
    y += 16;
  }
  y += 6;
  doc.setDrawColor(180);
  doc.line(totalsLabelX - 40, y - 2, pageWidth - marginX, y - 2);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`TOTAL ${invoice.currency}`, totalsLabelX, y, { align: "right" });
  doc.text(formatAmount(subtotal + vatTotal), colAmtRight, y, { align: "right" });

  y += 40;

  // ---------- Due date (bold, above payment details) ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Due Date: ${formatDate(new Date(invoice.dueDate))}`, marginX, y);
  y += 26;

  // ---------- Payment accounts ----------
  if (paymentAccounts.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("PAYMENT DETAILS", marginX, y);
    doc.setTextColor(0, 0, 0);
    y += 16;

    for (const acc of paymentAccounts) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const typeLabel =
        acc.type === "paypal"
          ? "PayPal"
          : acc.type === "wise"
            ? "Wise"
            : acc.type === "other"
              ? "Other"
              : "Bank";
      doc.text(`${acc.label}: ${typeLabel} (${acc.currency})`, marginX, y);
      y += 14;
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
        y += wrapped.length * 13;
      }
      y += 12;
    }
    y += 6;
  }

  // ---------- Notes ----------
  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("NOTES", marginX, y);
    doc.setTextColor(0, 0, 0);
    y += 14;
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - marginX * 2);
    doc.text(notesLines, marginX, y);
    y += notesLines.length * 13 + 10;
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
