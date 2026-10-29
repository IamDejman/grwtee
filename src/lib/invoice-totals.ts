/** Invoice line items and totals, shared by the Invoices page and the dashboard. */

export type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  vat: boolean;
};

export const VAT_RATE = 0.075;

/** An invoice's items: the JSON column, or the text it held before (WEB-23). */
export function parseItems(value: unknown): LineItem[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed) ? (parsed as LineItem[]) : [];
}

export function currencySymbol(currency: string) {
  return currency === "USD" ? "$" : "\u20A6";
}

export function formatMoney(amount: number, currency: string) {
  return `${currencySymbol(currency)}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/** Totals in whole kobo or cents, then back to the currency, so adding up
 *  doesn't drift by fractions of a cent (WEB-23). VAT is rounded per line. */
export function computeTotals(items: LineItem[]) {
  let subtotalMinor = 0;
  let vatMinor = 0;
  for (const it of items) {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const lineMinor = Math.round(qty * price * 100);
    subtotalMinor += lineMinor;
    if (it.vat) vatMinor += Math.round(lineMinor * VAT_RATE);
  }
  return {
    subtotal: subtotalMinor / 100,
    vat: vatMinor / 100,
    total: (subtotalMinor + vatMinor) / 100
  };
}
