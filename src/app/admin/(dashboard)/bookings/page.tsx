"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/admin/Toast";
import { Badge, EmptyState, Field, FilterChips, PageHeader, Panel, SearchInput, SkeletonRows, type Tone } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatBookingMessage, formatDateTime, formatServiceLabel } from "@/lib/utils";
import { adminFetch } from "@/lib/adminFetch";

type Booking = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  status: "pending" | "contacted" | "confirmed" | "completed";
};

const statusTone: Record<Booking["status"], Tone> = {
  pending: "gold",
  contacted: "purple",
  confirmed: "green",
  completed: "neutral"
};

const statusOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" }
];

function toCsv(rows: Booking[]) {
  const header = [
    "createdAt",
    "name",
    "email",
    "phone",
    "service",
    "status",
    "message"
  ];
  const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        esc(r.createdAt),
        esc(r.name),
        esc(r.email),
        esc(r.phone),
        esc(r.service),
        esc(r.status),
        esc(r.message)
      ].join(",")
    )
  ];
  return lines.join("\n");
}

export default function AdminBookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const toast = useToast();
  const [detail, setDetail] = useState<Booking | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const { confirm, dialog } = useConfirm();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/bookings?full=1&limit=200");
      const json = await res.json();
      if (!res.ok) throw new Error("Failed");
      setItems(json.data || []);
    } catch {
      setError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byStatus = status === "all" ? items : items.filter((b) => b.status === status);
    if (!q) return byStatus;
    return byStatus.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.service.toLowerCase().includes(q)
    );
  }, [items, query, status]);

  const chips = statusOptions.map((o) => ({
    ...o,
    count: o.value === "all" ? items.length : items.filter((b) => b.status === o.value).length
  }));

  const updateStatus = async (id: string, next: Booking["status"]) => {
    setSavingStatus(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.map((b) => (b.id === id ? { ...b, status: next } : b)));
      setDetail((d) => (d && d.id === id ? { ...d, status: next } : d));
      toast.success(`Marked ${statusOptions.find((o) => o.value === next)?.label.toLowerCase()}.`);
    } catch {
      toast.error("Couldn't update the status. Try again.");
    } finally {
      setSavingStatus(false);
    }
  };

  const remove = async (b: Booking) => {
    const ok = await confirm({
      title: `Delete ${b.name}'s booking?`,
      body: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    const id = b.id;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setItems((prev) => prev.filter((x) => x.id !== id));
      setDetail(null);
      toast.success("Booking deleted.");
    } catch {
      toast.error("Couldn't delete the booking. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grwtee-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusPill = (b: Booking) => (
    <Badge tone={statusTone[b.status]}>
      {statusOptions.find((o) => o.value === b.status)?.label ?? b.status}
    </Badge>
  );

  async function openDetail(b: Booking) {
    try {
      const res = await adminFetch(`/api/bookings/${b.id}`);
      const json = await res.json();
      if (res.ok && json.data) setDetail(json.data);
      else setDetail(b);
    } catch {
      setDetail(b);
    }
  }

  return (
    <div>
      <PageHeader
        title="Bookings"
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading || !filtered.length}>
            Export CSV
          </Button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips label="Filter by status" value={status} options={chips} onChange={setStatus} />
        <div className="lg:w-72">
          <SearchInput label="Search bookings" placeholder="Search name, email, service…" value={query} onChange={setQuery} />
        </div>
      </div>

      <Panel className="!p-0 sm:!p-0">
        {loading && !items.length ? (
          <div className="p-5">
            <SkeletonRows />
          </div>
        ) : !filtered.length ? (
          <EmptyState icon={CalendarCheck} title={items.length ? "No bookings match." : "No booking requests yet."} />
        ) : (
          <>
            {/* Phones: one card per booking. */}
            <ul className="divide-y divide-atelier-border/70 md:hidden">
              {filtered.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => openDetail(b)} className="block w-full px-4 py-4 text-left active:bg-atelier-canvas">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0 font-medium text-atelier-ink">{b.name}</span>
                      {statusPill(b)}
                    </span>
                    <span className="mt-1 block text-sm text-atelier-muted">{formatServiceLabel(b.service)}</span>
                    <span className="mt-1 block text-xs text-atelier-faint">{formatDateTime(b.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden px-6 pb-2 pt-5 md:block">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th className="text-right">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} className="cursor-pointer" onClick={() => openDetail(b)}>
                      <td>
                        <button type="button" className="text-left font-medium text-atelier-ink hover:text-purple-dark"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openDetail(b);
                          }}
                        >
                          {b.name}
                        </button>
                        <p className="text-xs text-atelier-faint">{b.email}</p>
                      </td>
                      <td className="text-atelier-muted">{formatServiceLabel(b.service)}</td>
                      <td>{statusPill(b)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums text-atelier-muted">{formatDateTime(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name}>
        {detail ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {statusPill(detail)}
              <span className="text-sm text-atelier-muted">{formatServiceLabel(detail.service)}</span>
            </div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Email">
                <a className="text-purple-dark underline-offset-2 hover:underline" href={`mailto:${detail.email}`}>
                  {detail.email}
                </a>
              </Field>
              <Field label="Phone">
                <a className="text-purple-dark underline-offset-2 hover:underline" href={`tel:${detail.phone}`}>
                  {detail.phone}
                </a>
              </Field>
              <Field label="Received">{formatDateTime(detail.createdAt)}</Field>
            </dl>
            <div className="mt-6 rounded-xl bg-atelier-canvas p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-atelier-faint">Message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-atelier-ink">
                {formatBookingMessage(detail.message)}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-4 border-t border-atelier-border pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="sm:w-56">
                <Select
                  label="Status"
                  value={detail.status}
                  disabled={savingStatus}
                  options={statusOptions.filter((o) => o.value !== "all")}
                  onChange={(e) => void updateStatus(detail.id, e.target.value as Booking["status"])}
                />
              </div>
              <Button variant="ghost" size="sm" className="!text-red-600 hover:!bg-red-50" onClick={() => void remove(detail)} loading={loading}>
                Delete booking
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
      {dialog}
    </div>
  );
}
