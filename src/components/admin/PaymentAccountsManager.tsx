"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/admin/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { adminFetch } from "@/lib/adminFetch";
import { useToast } from "@/components/admin/Toast";
import { Badge, EmptyState, Panel, RowAction, SkeletonRows, SwitchRow, type Tone } from "@/components/admin/ui";
import { Landmark } from "lucide-react";

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

const TYPE_TONE: Record<AccountType, Tone> = {
  bank: "purple",
  paypal: "neutral",
  wise: "green",
  other: "neutral"
};

async function apiError(res: Response): Promise<string> {
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  return typeof json?.error === "string" ? json.error : "";
}

function accountSummary(acc: PaymentAccount): string {
  if (acc.type === "bank") {
    return `${acc.bankName || "-"} · ${acc.accountNumber || "-"}`;
  }
  if (acc.type === "paypal" || acc.type === "wise") {
    return acc.email || "-";
  }
  return acc.notes?.split("\n")[0] || "-";
}

export function PaymentAccountsManager() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  // Asked for inside the add/edit window; every change to payment details needs it.
  const [stepUpPassword, setStepUpPassword] = useState("");
  const { askPassword, dialog } = useConfirm();

  const load = async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const res = await adminFetch("/api/payment-accounts");
      const json = (await res.json()) as { data?: PaymentAccount[] };
      if (!res.ok) throw new Error("Failed");
      setAccounts(json.data || []);
    } catch {
      setLoadError(true);
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
    setError(null);
    setStepUpPassword("");
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
    setError(null);
    setStepUpPassword("");
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
    if (!stepUpPassword) {
      setError("Enter your password to save this account.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { ...buildBody(), currentPassword: stepUpPassword };
      const res = editingId
        ? await adminFetch(`/api/payment-accounts/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...body,
              bankName: form.type === "bank" ? form.bankName.trim() : null,
              accountName: form.type === "bank" ? form.accountName.trim() : null,
              accountNumber: form.type === "bank" ? form.accountNumber.trim() : null,
              swiftCode: form.type === "bank" ? form.swiftCode.trim() || null : null,
              iban: form.type === "bank" ? form.iban.trim() || null : null,
              sortCode: form.type === "bank" ? form.sortCode.trim() || null : null,
              email:
                form.type === "paypal" || form.type === "wise"
                  ? form.email.trim()
                  : null
            })
          })
        : await adminFetch("/api/payment-accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: unknown } | null;
        throw new Error(typeof j?.error === "string" ? j.error : "Failed");
      }
      setShowForm(false);
      setStepUpPassword("");
      toast.success(editingId ? "Account saved." : "Account added.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't save the account. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (acc: PaymentAccount) => {
    const currentPassword = await askPassword({
      title: `Delete "${acc.label}"?`,
      body: "It will no longer appear on invoices or booking emails. This can't be undone.",
      confirmLabel: "Delete",
      danger: true
    });
    if (!currentPassword) return;
    setBusyId(acc.id);
    try {
      const res = await adminFetch(`/api/payment-accounts/${acc.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword })
      });
      if (!res.ok) throw new Error(await apiError(res));
      toast.success("Account deleted.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't delete the account. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (acc: PaymentAccount) => {
    const currentPassword = await askPassword({
      title: acc.active ? `Hide "${acc.label}" from invoices?` : `Show "${acc.label}" on invoices?`,
      confirmLabel: acc.active ? "Hide" : "Show"
    });
    if (!currentPassword) return;
    setBusyId(acc.id);
    try {
      const res = await adminFetch(`/api/payment-accounts/${acc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !acc.active, currentPassword })
      });
      if (!res.ok) throw new Error(await apiError(res));
      toast.success(acc.active ? "Hidden from invoices." : "Shown on invoices.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't update the account. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel
      title="Payment accounts"
      actions={
        <Button onClick={openNew} size="sm">
          Add account
        </Button>
      }
    >
      {dialog}
      <p className="-mt-2 mb-4 text-sm text-atelier-muted">Where clients pay you. Accounts that are shown appear on invoices and booking emails.</p>

      {loadError ? (
        <p className="text-sm text-red-700" role="alert">
          Couldn&apos;t load your payment accounts.{" "}
          <button type="button" onClick={() => void load()} className="font-medium underline underline-offset-2">
            Try again
          </button>
        </p>
      ) : loading && !accounts.length ? (
        <SkeletonRows rows={3} />
      ) : !accounts.length ? (
        <EmptyState icon={Landmark} title="No payment accounts yet." />
      ) : (
        <ul className="space-y-3">
          {accounts.map((acc) => (
            <li
              key={acc.id}
              className={`rounded-xl border border-atelier-border p-4 ${acc.active ? "bg-white" : "bg-atelier-canvas/70"}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-medium ${acc.active ? "text-atelier-ink" : "text-atelier-muted"}`}>{acc.label}</span>
                    <Badge tone={TYPE_TONE[acc.type]}>{TYPE_LABELS[acc.type]}</Badge>
                    <Badge tone="gold">{acc.currency}</Badge>
                    {!acc.active ? <Badge>Hidden</Badge> : null}
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {(acc.type === "bank"
                      ? [
                          ["Bank", acc.bankName],
                          ["Account name", acc.accountName],
                          ["Account number", acc.accountNumber],
                          ["SWIFT", acc.swiftCode],
                          ["IBAN", acc.iban],
                          ["Sort code", acc.sortCode]
                        ]
                      : acc.type === "paypal" || acc.type === "wise"
                        ? [["Email", acc.email]]
                        : []
                    )
                      .filter(([, v]) => v)
                      .map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <dt className="text-xs text-atelier-faint">{label}</dt>
                          <dd className="tabular-nums text-atelier-ink [overflow-wrap:anywhere]">{value}</dd>
                        </div>
                      ))}
                  </dl>
                  {acc.notes ? <p className="mt-2 whitespace-pre-wrap text-xs text-atelier-muted">{acc.notes}</p> : null}
                  <span className="sr-only">{accountSummary(acc)}</span>
                </div>
                <div className="-mx-1 flex shrink-0 flex-wrap gap-1">
                  <RowAction disabled={busyId === acc.id} onClick={() => openEdit(acc)} aria-label={`Edit ${acc.label}`}>
                    Edit
                  </RowAction>
                  <RowAction disabled={busyId === acc.id} onClick={() => void toggleActive(acc)} aria-label={`${acc.active ? "Hide" : "Show"} ${acc.label}`}>
                    {acc.active ? "Hide" : "Show"}
                  </RowAction>
                  <RowAction danger disabled={busyId === acc.id} onClick={() => void remove(acc)} aria-label={`Delete ${acc.label}`}>
                    Delete
                  </RowAction>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <h3 className="font-cormorant text-2xl font-medium text-atelier-ink">
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
                  autoComplete="off"
                  spellCheck={false}
                  required
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountNumber: e.target.value }))
                  }
                />
                <Input
                  label="SWIFT / BIC"
                  autoComplete="off"
                  spellCheck={false}
                  value={form.swiftCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, swiftCode: e.target.value }))
                  }
                />
                <Input
                  label="IBAN"
                  autoComplete="off"
                  spellCheck={false}
                  value={form.iban}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, iban: e.target.value }))
                  }
                />
                <Input
                  label="Sort code"
                  autoComplete="off"
                  spellCheck={false}
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
                  autoComplete="off"
                  spellCheck={false}
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
              <SwitchRow
                label="Show on invoices and booking emails"
                checked={form.active}
                onChange={(active) => setForm((f) => ({ ...f, active }))}
              />
            </div>

            <div className="border-t border-atelier-border pt-4 md:col-span-2">
              <Input
                label="Your password"
                type="password"
                autoComplete="current-password"
                value={stepUpPassword}
                onChange={(e) => setStepUpPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-atelier-faint">Needed to save payment details.</p>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setShowForm(false)} type="button">
              Cancel
            </Button>
            <Button loading={submitting} type="submit">
              {editingId ? "Save changes" : "Add account"}
            </Button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
