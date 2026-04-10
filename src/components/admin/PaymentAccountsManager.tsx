"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";

export type PaymentAccount = {
  id: string;
  label: string;
  currency: "NGN" | "USD";
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode: string | null;
  iban: string | null;
  sortCode: string | null;
  notes: string | null;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  label: string;
  currency: "NGN" | "USD";
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode: string;
  iban: string;
  sortCode: string;
  notes: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  label: "",
  currency: "NGN",
  bankName: "",
  accountName: "",
  accountNumber: "",
  swiftCode: "",
  iban: "",
  sortCode: "",
  notes: "",
  active: true
});

export function PaymentAccountsManager() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payment-accounts");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setAccounts(json.data || []);
    } catch {
      setError("Failed to load payment accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (acc: PaymentAccount) => {
    setEditingId(acc.id);
    setForm({
      label: acc.label,
      currency: acc.currency,
      bankName: acc.bankName,
      accountName: acc.accountName,
      accountNumber: acc.accountNumber,
      swiftCode: acc.swiftCode || "",
      iban: acc.iban || "",
      sortCode: acc.sortCode || "",
      notes: acc.notes || "",
      active: acc.active
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.label.trim() || !form.bankName.trim() || !form.accountName.trim() || !form.accountNumber.trim()) {
      setError("Label, bank, account name, and account number are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        label: form.label.trim(),
        currency: form.currency,
        bankName: form.bankName.trim(),
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        swiftCode: form.swiftCode.trim() || null,
        iban: form.iban.trim() || null,
        sortCode: form.sortCode.trim() || null,
        notes: form.notes.trim() || null,
        active: form.active
      };
      const res = editingId
        ? await fetch(`/api/payment-accounts/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          })
        : await fetch("/api/payment-accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j?.error === "string" ? j.error : "Failed");
      }
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save account.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (acc: PaymentAccount) => {
    if (!confirm(`Delete "${acc.label}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payment-accounts/${acc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await load();
    } catch {
      setError("Failed to delete account.");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (acc: PaymentAccount) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payment-accounts/${acc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !acc.active })
      });
      if (!res.ok) throw new Error("Failed");
      await load();
    } catch {
      setError("Failed to update account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-purple-dark">
            Payment Accounts
          </h2>
          <p className="mt-2 text-sm text-gray-dark/80">
            Bank accounts shown on invoice PDFs. Active NGN accounts appear on
            NGN invoices, active USD accounts on USD invoices.
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          Add account
        </Button>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className={`rounded-lg border p-4 ${
              acc.active
                ? "border-gray-medium/60 bg-white"
                : "border-gray-medium/40 bg-cream-light opacity-70"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-purple-dark">{acc.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      acc.currency === "USD"
                        ? "bg-green-600/10 text-green-700"
                        : "bg-purple-medium/10 text-purple-medium"
                    }`}
                  >
                    {acc.currency}
                  </span>
                  {!acc.active ? (
                    <span className="rounded-full bg-gray-medium/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-dark">
                      Hidden
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-1 text-sm text-gray-dark/85 sm:grid-cols-2">
                  <div>
                    <span className="text-gray-dark/60">Bank:</span> {acc.bankName}
                  </div>
                  <div>
                    <span className="text-gray-dark/60">Account name:</span> {acc.accountName}
                  </div>
                  <div>
                    <span className="text-gray-dark/60">Account number:</span>{" "}
                    <span className="font-mono">{acc.accountNumber}</span>
                  </div>
                  {acc.swiftCode ? (
                    <div>
                      <span className="text-gray-dark/60">SWIFT:</span>{" "}
                      <span className="font-mono">{acc.swiftCode}</span>
                    </div>
                  ) : null}
                  {acc.iban ? (
                    <div>
                      <span className="text-gray-dark/60">IBAN:</span>{" "}
                      <span className="font-mono">{acc.iban}</span>
                    </div>
                  ) : null}
                  {acc.sortCode ? (
                    <div>
                      <span className="text-gray-dark/60">Sort code:</span>{" "}
                      <span className="font-mono">{acc.sortCode}</span>
                    </div>
                  ) : null}
                </div>
                {acc.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-gray-dark/70">
                    {acc.notes}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="min-h-[36px] rounded-md border border-purple-dark px-3 py-1.5 text-xs font-semibold text-purple-dark hover:bg-purple-dark/10"
                  onClick={() => openEdit(acc)}
                >
                  Edit
                </button>
                <button
                  className="min-h-[36px] rounded-md border border-gray-medium px-3 py-1.5 text-xs font-semibold text-gray-dark hover:bg-gray-medium/20"
                  onClick={() => toggleActive(acc)}
                >
                  {acc.active ? "Hide" : "Show"}
                </button>
                <button
                  className="min-h-[36px] rounded-md border border-red-600 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  onClick={() => remove(acc)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {!accounts.length && !loading ? (
          <p className="rounded-lg border border-dashed border-gray-medium/60 p-6 text-center text-sm text-gray-dark/70">
            No payment accounts yet. Click <strong>Add account</strong> to add one.
          </p>
        ) : null}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <div>
          <h3 className="font-heading text-xl font-semibold text-purple-dark">
            {editingId ? "Edit account" : "New payment account"}
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label="Label"
              required
              placeholder="e.g. GTBank NGN"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
            <Select
              label="Currency"
              options={[
                { value: "NGN", label: "NGN (₦)" },
                { value: "USD", label: "USD ($)" }
              ]}
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({ ...f, currency: e.target.value as "NGN" | "USD" }))
              }
            />
            <Input
              label="Bank name"
              required
              value={form.bankName}
              onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            />
            <Input
              label="Account name"
              required
              value={form.accountName}
              onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
            />
            <Input
              label="Account number"
              required
              value={form.accountNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountNumber: e.target.value }))
              }
            />
            <Input
              label="SWIFT / BIC"
              value={form.swiftCode}
              onChange={(e) => setForm((f) => ({ ...f, swiftCode: e.target.value }))}
            />
            <Input
              label="IBAN"
              value={form.iban}
              onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
            />
            <Input
              label="Sort code"
              value={form.sortCode}
              onChange={(e) => setForm((f) => ({ ...f, sortCode: e.target.value }))}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Notes (optional)"
                rows={2}
                placeholder="e.g. intermediary bank instructions"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-dark">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Active (shown on invoices)
              </label>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setShowForm(false)} type="button">
              Cancel
            </Button>
            <Button onClick={save} loading={submitting} type="button">
              {editingId ? "Save changes" : "Add account"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
