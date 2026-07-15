"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { adminFetch } from "@/lib/adminFetch";

// Stored/server format — numbers
type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  vat: boolean;
};

// Form state — strings so inputs can be cleared/edited naturally
type LineItemDraft = {
  description: string;
  quantity: string;
  unitPrice: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientAddress: string | null;
  currency: "NGN" | "USD";
  items: string; // JSON
  notes: string | null;
  dueDate: string;
  status: "unpaid" | "paid";
  createdAt: string;
};

const VAT_RATE = 0.075;

// Tolerate thousands separators and currency symbols typed or pasted into
// amount fields (e.g. "1,280,000.00", "₦1 280 000").
function parseAmount(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseItems(json: string): LineItem[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed as LineItem[];
  } catch {
    // ignore
  }
  return [];
}

function currencySymbol(currency: string) {
  return currency === "USD" ? "$" : "\u20A6";
}

function formatMoney(amount: number, currency: string) {
  return `${currencySymbol(currency)}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function computeTotals(items: LineItem[]) {
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

function computeDraftTotals(drafts: LineItemDraft[], applyVat: boolean) {
  return computeTotals(
    drafts.map((d) => ({
      description: d.description,
      quantity: parseAmount(d.quantity),
      unitPrice: parseAmount(d.unitPrice),
      vat: applyVat
    }))
  );
}

const emptyDraft = (): LineItemDraft => ({
  description: "",
  quantity: "1",
  unitPrice: ""
});

type PaymentAccountOption = {
  id: string;
  label: string;
  type: "bank" | "paypal" | "wise" | "other";
  currency: "NGN" | "USD" | "GBP" | "EUR";
  bankName: string | null;
  accountNumber: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
};

function accountSecondaryLine(acc: PaymentAccountOption): string {
  if (acc.type === "bank") {
    const parts: string[] = [];
    if (acc.bankName) parts.push(acc.bankName);
    if (acc.accountNumber) parts.push(acc.accountNumber);
    return parts.join(" · ");
  }
  if (acc.type === "paypal") return `PayPal: ${acc.email || "-"}`;
  if (acc.type === "wise") return `Wise: ${acc.email || "-"}`;
  return acc.notes?.split("\n")[0] || "-";
}

export default function AdminInvoicesPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [lineDrafts, setLineDrafts] = useState<LineItemDraft[]>([emptyDraft()]);
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");
  // Invoice-level VAT toggle (applies 7.5% to all line items)
  const [applyVat, setApplyVat] = useState(false);

  // Payment accounts (loaded once)
  const [accounts, setAccounts] = useState<PaymentAccountOption[]>([]);
  // Which account IDs the user has explicitly selected for this invoice.
  // null = "use all active matching-currency accounts" (default behavior)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[] | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/invoices?limit=200&full=1");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setItems(json.data || []);
    } catch {
      setError("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const res = await adminFetch("/api/payment-accounts");
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setAccounts(json.data);
      }
    } catch {
      // Non-fatal — form still works without account selection
    }
  };

  useEffect(() => {
    void load();
    void loadAccounts();
  }, []);

  // Live totals reflect the global VAT toggle
  const totals = useMemo(
    () => computeDraftTotals(lineDrafts, applyVat),
    [lineDrafts, applyVat]
  );

  // Active accounts matching the invoice currency (default candidates for the PDF)
  const matchingAccounts = useMemo(
    () => accounts.filter((a) => a.active && a.currency === currency),
    [accounts, currency]
  );

  const resetForm = () => {
    setClientName("");
    setClientAddress("");
    setCurrency("NGN");
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().slice(0, 10));
    setLineDrafts([emptyDraft()]);
    setNotes("");
    setReference("");
    setApplyVat(false);
    setSelectedAccountIds(null);
  };

  const updateDraft = (index: number, patch: Partial<LineItemDraft>) => {
    setLineDrafts((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  };

  const addDraft = () => setLineDrafts((prev) => [...prev, emptyDraft()]);
  const removeDraft = (index: number) =>
    setLineDrafts((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      if (prev === null) {
        // Switching from "all" to explicit: start with just this one
        return [id];
      }
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next;
      }
      return [...prev, id];
    });
  };

  const resetAccountSelection = () => setSelectedAccountIds(null);

  const create = async () => {
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    if (!lineDrafts.length || lineDrafts.some((i) => !i.description.trim())) {
      setError("All line items need a description.");
      return;
    }
    if (lineDrafts.some((i) => !(parseAmount(i.unitPrice) > 0))) {
      setError("Each line item needs a unit price greater than 0.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminFetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientAddress: clientAddress || null,
          currency,
          dueDate,
          notes: notes || null,
          reference: reference || null,
          items: lineDrafts.map((i) => ({
            description: i.description.trim(),
            quantity: parseAmount(i.quantity),
            unitPrice: parseAmount(i.unitPrice),
            vat: applyVat
          })),
          paymentAccountIds: selectedAccountIds ?? undefined
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j?.error === "string" ? j.error : "Failed");
      }
      setShowForm(false);
      resetForm();
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create invoice.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (inv: Invoice) => {
    setLoading(true);
    try {
      const next = inv.status === "paid" ? "unpaid" : "paid";
      const res = await adminFetch(`/api/invoices/${inv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) throw new Error("Failed");
      await load();
    } catch {
      setError("Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (inv: Invoice) => {
    if (!confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    setLoading(true);
    try {
      const res = await adminFetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await load();
    } catch {
      setError("Failed to delete invoice.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (inv: Invoice) => {
    try {
      const res = await adminFetch(`/api/invoices/${inv.id}/pdf-link`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json?.data?.url) throw new Error("Failed");
      // The PDF route serves Content-Disposition: attachment, so navigating
      // to the signed URL downloads without leaving the page. window.open
      // after an await gets popup-blocked (silently, on iPad Safari).
      window.location.assign(json.data.url);
    } catch {
      setError("Failed to generate secure PDF link.");
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">
            Invoices
          </h1>
          <p className="mt-2 text-sm text-gray-dark/80">
            Create and manage client invoices. Download as PDF.
          </p>
          <p className="mt-1 text-xs text-gray-dark/70">
            Bank/payment details shown on invoices are managed in{" "}
            <Link
              href="/admin/settings"
              className="font-semibold text-green-dark underline hover:text-purple-dark"
            >
              Settings
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)}>New Invoice</Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {/* Mobile card list */}
      <div className="mt-6 space-y-3 md:hidden">
        {items.map((inv) => {
          const parsed = parseItems(inv.items);
          const t = computeTotals(parsed);
          return (
            <div
              key={inv.id}
              className="rounded-xl bg-white p-4 shadow-md ring-1 ring-gray-medium/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-purple-medium">{inv.invoiceNumber}</p>
                  <p className="mt-0.5 truncate text-sm text-gray-dark">{inv.clientName}</p>
                </div>
                <span
                  className={[
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    inv.status === "paid"
                      ? "bg-green-600/10 text-green-700"
                      : "bg-gold/20 text-gray-dark"
                  ].join(" ")}
                >
                  {inv.status === "paid" ? "Paid" : "Unpaid"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-dark/80">
                <div>
                  <p className="uppercase tracking-wider text-gray-dark/60">Total</p>
                  <p className="text-sm font-semibold text-gray-dark">
                    {formatMoney(t.total, inv.currency)}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-wider text-gray-dark/60">Due</p>
                  <p className="text-sm font-semibold text-gray-dark">
                    {formatDate(inv.dueDate)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="min-h-[40px] rounded-md bg-purple-dark px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => downloadPdf(inv)}
                >
                  PDF
                </button>
                <button
                  className="min-h-[40px] rounded-md border border-purple-dark px-3 py-2 text-xs font-semibold text-purple-dark"
                  onClick={() => toggleStatus(inv)}
                >
                  {inv.status === "paid" ? "Mark unpaid" : "Mark paid"}
                </button>
                <button
                  className="min-h-[40px] rounded-md border border-red-600 px-3 py-2 text-xs font-semibold text-red-600"
                  onClick={() => remove(inv)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        {!items.length && !loading ? (
          <p className="rounded-xl bg-white p-4 text-sm text-gray-dark/70 ring-1 ring-gray-medium/60">
            No invoices yet.
          </p>
        ) : null}
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-gray-medium/60 text-left text-xs font-semibold uppercase tracking-wider text-gray-dark/70">
                <th className="py-3 pr-4">Number</th>
                <th className="py-3 pr-4">Client</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Due</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-medium/60">
              {items.map((inv) => {
                const parsed = parseItems(inv.items);
                const t = computeTotals(parsed);
                return (
                  <tr key={inv.id}>
                    <td className="py-3 pr-4 font-semibold text-purple-medium">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 pr-4">{inv.clientName}</td>
                    <td className="py-3 pr-4">{formatMoney(t.total, inv.currency)}</td>
                    <td className="py-3 pr-4 text-gray-dark/80">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="py-3 pr-4 text-gray-dark/80">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          inv.status === "paid"
                            ? "bg-green-600/10 text-green-700"
                            : "bg-gold/20 text-gray-dark"
                        ].join(" ")}
                      >
                        {inv.status === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-md bg-purple-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-medium"
                          onClick={() => downloadPdf(inv)}
                        >
                          PDF
                        </button>
                        <button
                          className="rounded-md border border-purple-dark px-3 py-1.5 text-xs font-semibold text-purple-dark hover:bg-purple-dark/10"
                          onClick={() => toggleStatus(inv)}
                        >
                          {inv.status === "paid" ? "Mark unpaid" : "Mark paid"}
                        </button>
                        <button
                          className="rounded-md border border-red-600 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                          onClick={() => remove(inv)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && !loading ? (
                <tr>
                  <td className="py-4 text-gray-dark/70" colSpan={7}>
                    No invoices yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <div>
          <h3 className="font-heading text-xl font-semibold text-purple-dark">
            New Invoice
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Client name"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <Select
              label="Currency"
              options={[
                { value: "NGN", label: "NGN (₦)" },
                { value: "USD", label: "USD ($)" }
              ]}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "NGN" | "USD")}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Client address"
                rows={2}
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
              />
            </div>
            <DatePicker
              mode="single"
              label="Due date"
              value={dueDate || null}
              onChange={(v) => setDueDate(v || "")}
            />
            <Input
              label="Reference (optional)"
              placeholder="e.g. PO #1234, project code"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-dark">Line items</p>
              <Button variant="outline" size="sm" onClick={addDraft} type="button">
                Add row
              </Button>
            </div>

            {/* Desktop column headers — use flex with fixed widths matching the rows */}
            <div className="mt-3 hidden items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-dark/70 md:flex">
              <div className="flex-1">Description</div>
              <div className="w-24">Quantity</div>
              <div className="w-40">Unit price</div>
              <div className="w-10" aria-hidden="true" />
            </div>

            <div className="mt-2 space-y-3">
              {lineDrafts.map((it, idx) => (
                <div key={idx} className="rounded-lg bg-cream-light p-3">
                  {/* Mobile: stacked grid. Desktop: flex row with fixed widths. */}
                  <div className="grid gap-3 md:hidden">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-dark">
                        Description
                      </label>
                      <Input
                        placeholder="Description"
                        value={it.description}
                        onChange={(e) => updateDraft(idx, { description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-dark">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step="1"
                          placeholder="1"
                          value={it.quantity}
                          onChange={(e) => updateDraft(idx, { quantity: e.target.value })}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-dark">
                          Unit price ({currencySymbol(currency)})
                        </label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={it.unitPrice}
                          onChange={(e) => updateDraft(idx, { unitPrice: e.target.value })}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="min-h-[40px] rounded-md border border-red-600 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                      onClick={() => removeDraft(idx)}
                      disabled={lineDrafts.length <= 1}
                      aria-label="Remove line item"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="hidden items-start gap-3 md:flex">
                    <div className="flex-1">
                      <Input
                        placeholder="Description"
                        value={it.description}
                        onChange={(e) => updateDraft(idx, { description: e.target.value })}
                      />
                    </div>
                    <div className="w-24 shrink-0">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step="1"
                        placeholder="1"
                        value={it.quantity}
                        onChange={(e) => updateDraft(idx, { quantity: e.target.value })}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                    <div className="w-40 shrink-0">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={it.unitPrice}
                        onChange={(e) => updateDraft(idx, { unitPrice: e.target.value })}
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                    <div className="w-10 shrink-0 pt-1">
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-600 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                        onClick={() => removeDraft(idx)}
                        disabled={lineDrafts.length <= 1}
                        aria-label="Remove line item"
                        title="Remove line item"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment account selector */}
          <div className="mt-6 rounded-lg bg-white p-4 ring-1 ring-gray-medium/60">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-dark">
                  Payment accounts on this invoice
                </p>
                <p className="mt-1 text-xs text-gray-dark/70">
                  By default, all active {currency} accounts will be shown on the
                  PDF. Check specific ones below to override.
                </p>
              </div>
              {selectedAccountIds !== null ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-green-dark underline hover:text-purple-dark"
                  onClick={resetAccountSelection}
                >
                  Use all ({currency})
                </button>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {matchingAccounts.length === 0 ? (
                <p className="rounded-md border border-dashed border-gray-medium/60 p-3 text-xs text-gray-dark/70">
                  No active {currency} accounts. Add one in{" "}
                  <Link
                    href="/admin/settings"
                    className="font-semibold text-green-dark underline"
                  >
                    Settings
                  </Link>
                  .
                </p>
              ) : (
                matchingAccounts.map((acc) => {
                  const isChecked =
                    selectedAccountIds === null
                      ? true
                      : selectedAccountIds.includes(acc.id);
                  const typeLabel =
                    acc.type === "paypal"
                      ? "PayPal"
                      : acc.type === "wise"
                        ? "Wise"
                        : acc.type === "other"
                          ? "Other"
                          : "Bank";
                  return (
                    <label
                      key={acc.id}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-medium/40 bg-cream-light p-3 hover:border-purple-dark/40"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4"
                        checked={isChecked}
                        onChange={() => toggleAccount(acc.id)}
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-purple-dark">
                            {acc.label}
                          </span>
                          <span className="rounded-full bg-gray-medium/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-dark">
                            {typeLabel}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-gray-dark/80">
                          {accountSecondaryLine(acc)}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-white p-4 ring-1 ring-gray-medium/60">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={applyVat}
                onChange={(e) => setApplyVat(e.target.checked)}
              />
              <span className="text-sm font-semibold text-gray-dark">
                Apply VAT (7.5%) to this invoice
              </span>
            </label>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(totals.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (7.5%)</span>
                <span>{formatMoney(totals.vat, currency)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-medium/60 pt-2 text-base font-semibold text-purple-dark">
                <span>Total</span>
                <span>{formatMoney(totals.total, currency)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Textarea
              label="Notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setShowForm(false)} type="button">
              Cancel
            </Button>
            <Button onClick={create} loading={submitting} type="button">
              Create invoice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
