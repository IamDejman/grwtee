/** Invoice line items and totals, shared by the Invoices page and the dashboard. */

export type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  vat: boolean;
};

export const VAT_RATE = 0.075;

export function parseItems(json: string): LineItem[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed as LineItem[];
  } catch {
    // ignore
  }
  return [];
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

export function computeTotals(items: LineItem[]) {
  let subtotal = 0;
  let vat = 0;
  for (const it of items) {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const line = qty * price;
    subtotal += line;
    if (it.vat) vat += line * VAT_RATE;
  }
  return { subtotal, vat, total: subtotal + vat };
}
