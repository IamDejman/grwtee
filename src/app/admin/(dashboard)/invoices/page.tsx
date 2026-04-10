"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  vat: boolean;
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

const emptyItem = (): LineItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  vat: false
});

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
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyItem()]);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invoices?limit=200");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setItems(json.data || []);
    } catch {
      setError("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => computeTotals(lineItems), [lineItems]);

  const resetForm = () => {
    setClientName("");
    setClientAddress("");
    setCurrency("NGN");
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().slice(0, 10));
    setLineItems([emptyItem()]);
    setNotes("");
  };

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  };

  const addItem = () => setLineItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) =>
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const create = async () => {
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    if (!lineItems.length || lineItems.some((i) => !i.description.trim())) {
      setError("All line items need a description.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientAddress: clientAddress || null,
          currency,
          dueDate,
          notes: notes || null,
          items: lineItems.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity) || 0,
            unitPrice: Number(i.unitPrice) || 0,
            vat: !!i.vat
          }))
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed");
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
      const res = await fetch(`/api/invoices/${inv.id}`, {
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
      const res = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await load();
    } catch {
      setError("Failed to delete invoice.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = (inv: Invoice) => {
    window.open(`/api/invoices/${inv.id}/pdf`, "_blank");
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

      <div className="mt-6 rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
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
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <button
                          className="text-green-dark hover:text-purple-dark"
                          onClick={() => downloadPdf(inv)}
                        >
                          PDF
                        </button>
                        <button
                          className="text-green-dark hover:text-purple-dark"
                          onClick={() => toggleStatus(inv)}
                        >
                          {inv.status === "paid" ? "Mark unpaid" : "Mark paid"}
                        </button>
                        <button
                          className="text-red-600 hover:text-red-700"
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
            <Input
              type="date"
              label="Due date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-dark">Line items</p>
              <Button variant="outline" onClick={addItem} type="button">
                Add row
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {lineItems.map((it, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-lg bg-cream-light p-3 md:grid-cols-12"
                >
                  <div className="md:col-span-5">
                    <Input
                      placeholder="Description"
                      value={it.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(idx, { quantity: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Unit price"
                      value={it.unitPrice}
                      onChange={(e) =>
                        updateItem(idx, { unitPrice: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="flex items-center md:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-gray-dark">
                      <input
                        type="checkbox"
                        checked={it.vat}
                        onChange={(e) => updateItem(idx, { vat: e.target.checked })}
                      />
                      VAT
                    </label>
                  </div>
                  <div className="flex items-center justify-end md:col-span-1">
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                      onClick={() => removeItem(idx)}
                      disabled={lineItems.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-white p-4 ring-1 ring-gray-medium/60">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatMoney(totals.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>VAT (7.5%)</span>
              <span>{formatMoney(totals.vat, currency)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-medium/60 pt-2 text-base font-semibold text-purple-dark">
              <span>Total</span>
              <span>{formatMoney(totals.total, currency)}</span>
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

          <div className="mt-6 flex justify-end gap-3">
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
