"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";

export type AccountType = "bank" | "paypal" | "wise" | "other";
export type AccountCurrency = "NGN" | "USD" | "GBP" | "EUR";

export type PaymentAccount = {
  id: string;
  label: string;
  type: AccountType;
  currency: AccountCurrency;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  swiftCode: string | null;
  iban: string | null;
  sortCode: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  label: string;
  type: AccountType;
  currency: AccountCurrency;
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode: string;
  iban: string;
  sortCode: string;
  email: string;
  notes: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  label: "",
  type: "bank",
  currency: "NGN",
  bankName: "",
  accountName: "",
  accountNumber: "",
  swiftCode: "",
  iban: "",
  sortCode: "",
  email: "",
  notes: "",
  active: true
});

const TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank account",
  paypal: "PayPal",
  wise: "Wise",
  other: "Other"
};

const TYPE_BADGE_CLASS: Record<AccountType, string> = {
  bank: "bg-purple-medium/10 text-purple-medium",
  paypal: "bg-blue-600/10 text-blue-700",
  wise: "bg-green-600/10 text-green-700",
  other: "bg-gray-medium/30 text-gray-dark"
};

function accountSummary(acc: PaymentAccount): string {
  if (acc.type === "bank") {
    return `${acc.bankName || "—"} · ${acc.accountNumber || "—"}`;
  }
  if (acc.type === "paypal" || acc.type === "wise") {
    return acc.email || "—";
  }
  return acc.notes?.split("\n")[0] || "—";
}

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
      type: acc.type,
      currency: acc.currency,
      bankName: acc.bankName || "",
      accountName: acc.accountName || "",
      accountNumber: acc.accountNumber || "",
      swiftCode: acc.swiftCode || "",
      iban: acc.iban || "",
      sortCode: acc.sortCode || "",
      email: acc.email || "",
      notes: acc.notes || "",
      active: acc.active
    });
    setShowForm(true);
  };

  const validateForm = (): string | null => {
    if (!form.label.trim()) return "Label is required.";
    if (form.type === "bank") {
      if (!form.bankName.trim()) return "Bank name is required.";
      if (!form.accountName.trim()) return "Account name is required.";
      if (!form.accountNumber.trim()) return "Account number is required.";
    } else if (form.type === "paypal" || form.type === "wise") {
      if (!form.email.trim()) return "Email is required.";
      // Basic email regex
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        return "Enter a valid email.";
      }
    } else if (form.type === "other") {
      if (!form.notes.trim()) return "Payment instructions are required for 'Other'.";
    }
    return null;
  };

  const buildBody = () => {
    // Build a typed body depending on the selected account type.
    const base = {
      label: form.label.trim(),
      type: form.type,
      currency: form.currency,
      notes: form.notes.trim() || null,
      active: form.active
    };
    if (form.type === "bank") {
      return {
        ...base,
        bankName: form.bankName.trim(),
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        swiftCode: form.swiftCode.trim() || null,
        iban: form.iban.trim() || null,
        sortCode: form.sortCode.trim() || null
      };
    }
    if (form.type === "paypal" || form.type === "wise") {
      return { ...base, email: form.email.trim() };
    }
    // "other" — notes carries the instructions; ensure it's required (validated above)
    return { ...base, notes: form.notes.trim() };
  };

  const save = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = buildBody();
      const res = editingId
        ? await fetch(`/api/payment-accounts/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            // On edit we also need to clear fields that don't belong to the selected type
            body: JSON.stringify({
              ...body,
              // Clear bank fields for non-bank types
              bankName: form.type === "bank" ? form.bankName.trim() : null,
              accountName: form.type === "bank" ? form.accountName.trim() : null,
              accountNumber: form.type === "bank" ? form.accountNumber.trim() : null,
              swiftCode: form.type === "bank" ? form.swiftCode.trim() || null : null,
              iban: form.type === "bank" ? form.iban.trim() || null : null,
              sortCode: form.type === "bank" ? form.sortCode.trim() || null : null,
              // Clear email for non-email types
              email:
                form.type === "paypal" || form.type === "wise"
                  ? form.email.trim()
                  : null
            })
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
            Bank accounts, PayPal, Wise, or other payment methods shown on
            invoice PDFs. Filtered by invoice currency by default.
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
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TYPE_BADGE_CLASS[acc.type]}`}
                  >
                    {TYPE_LABELS[acc.type]}
                  </span>
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-dark">
                    {acc.currency}
                  </span>
                  {!acc.active ? (
                    <span className="rounded-full bg-gray-medium/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-dark">
                      Hidden
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-1 text-sm text-gray-dark/85 sm:grid-cols-2">
                  {acc.type === "bank" ? (
                    <>
                      <div>
                        <span className="text-gray-dark/60">Bank:</span> {acc.bankName}
                      </div>
                      <div>
                        <span className="text-gray-dark/60">Account name:</span>{" "}
                        {acc.accountName}
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
                    </>
                  ) : acc.type === "paypal" || acc.type === "wise" ? (
                    <div className="sm:col-span-2">
                      <span className="text-gray-dark/60">Email:</span>{" "}
                      <span className="font-mono">{acc.email}</span>
                    </div>
                  ) : null}
                </div>
                {acc.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-gray-dark/70">
                    {acc.notes}
                  </p>
                ) : null}
                {/* Screen-reader friendly summary for list views */}
                <span className="sr-only">{accountSummary(acc)}</span>
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
              placeholder={
                form.type === "paypal"
                  ? "e.g. Personal PayPal"
                  : form.type === "wise"
                    ? "e.g. Wise USD"
                    : form.type === "other"
                      ? "e.g. Crypto"
                      : "e.g. GTBank NGN"
              }
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
            <Select
              label="Type"
              options={[
                { value: "bank", label: "Bank account" },
                { value: "paypal", label: "PayPal" },
                { value: "wise", label: "Wise" },
                { value: "other", label: "Other (free text)" }
              ]}
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as AccountType }))
              }
            />
            <Select
              label="Currency"
              options={[
                { value: "NGN", label: "NGN (₦)" },
                { value: "USD", label: "USD ($)" },
                { value: "GBP", label: "GBP (£)" },
                { value: "EUR", label: "EUR (€)" }
              ]}
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  currency: e.target.value as AccountCurrency
                }))
              }
            />

            {/* Type-specific fields */}
            {form.type === "bank" ? (
              <>
                <div className="md:col-span-2">
                  <hr className="border-gray-medium/40" />
                </div>
                <Input
                  label="Bank name"
                  required
                  value={form.bankName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bankName: e.target.value }))
                  }
                />
                <Input
                  label="Account name"
                  required
                  value={form.accountName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountName: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, swiftCode: e.target.value }))
                  }
                />
                <Input
                  label="IBAN"
                  value={form.iban}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, iban: e.target.value }))
                  }
                />
                <Input
                  label="Sort code"
                  value={form.sortCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortCode: e.target.value }))
                  }
                />
              </>
            ) : null}

            {form.type === "paypal" || form.type === "wise" ? (
              <div className="md:col-span-2">
                <Input
                  type="email"
                  label={`${TYPE_LABELS[form.type]} email`}
                  required
                  placeholder="your.email@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
            ) : null}

            {form.type === "other" ? (
              <div className="md:col-span-2">
                <Textarea
                  label="Payment instructions"
                  required
                  rows={3}
                  placeholder="e.g. Send via Western Union to..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
                <p className="mt-1 text-xs text-gray-dark/70">
                  The full text will be printed on the invoice under this account.
                </p>
              </div>
            ) : null}

            {/* Optional notes for bank/paypal/wise (other uses notes as its main field) */}
            {form.type !== "other" ? (
              <div className="md:col-span-2">
                <Textarea
                  label="Notes (optional)"
                  rows={2}
                  placeholder="e.g. Intermediary bank instructions, memo requirements"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
            ) : null}

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
