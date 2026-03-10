"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { formatBookingMessage, formatDateTime, formatServiceLabel } from "@/lib/utils";

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

const statusOptions = [
  { value: "all", label: "All statuses" },
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [detail, setDetail] = useState<Booking | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        status === "all" ? "/api/bookings?limit=200" : `/api/bookings?status=${status}&limit=200`;
      const res = await fetch(url);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.service.toLowerCase().includes(q)
    );
  }, [items, query]);

  const updateStatus = async (id: string, next: Booking["status"]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
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

  const remove = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      await load();
      setDetail(null);
    } catch {
      setError("Failed to delete booking.");
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

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">
            Booking Requests
          </h1>
          <p className="mt-2 text-sm text-gray-dark/80">
            Review, update status, export, and manage client submissions.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={loading}>
            Export CSV
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Search"
            placeholder="Name, email, service…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <div className="rounded-lg bg-cream-light p-4 text-sm text-gray-dark/80">
            <p className="font-semibold text-green-dark">Total</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-purple-dark">
              {filtered.length}
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-gray-medium/60 text-left text-xs font-semibold uppercase tracking-wider text-gray-dark/70">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Phone</th>
                <th className="py-3 pr-4">Service</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-medium/60">
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="py-3 pr-4 text-gray-dark/80">
                    {formatDateTime(b.createdAt)}
                  </td>
                  <td className="py-3 pr-4 font-semibold text-purple-medium">
                    {b.name}
                  </td>
                  <td className="py-3 pr-4">{b.email}</td>
                  <td className="py-3 pr-4">{b.phone}</td>
                  <td className="py-3 pr-4">{formatServiceLabel(b.service)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        b.status === "pending"
                          ? "bg-gold/20 text-gray-dark"
                          : b.status === "contacted"
                            ? "bg-green-dark/10 text-green-dark"
                            : b.status === "confirmed"
                              ? "bg-purple-medium/10 text-purple-medium"
                              : "bg-green-600/10 text-green-700"
                      ].join(" ")}
                    >
                      {statusOptions.find((o) => o.value === b.status)?.label ?? b.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      className="text-xs font-semibold text-green-dark hover:text-purple-dark"
                      onClick={() => setDetail(b)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="py-4 text-gray-dark/70" colSpan={7}>
                    No bookings found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail ? (
          <div>
            <h3 className="font-heading text-xl font-semibold text-purple-dark">
              Booking detail
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-cream-light p-4">
                <p className="text-xs font-semibold tracking-wider text-green-dark">
                  Contact
                </p>
                <p className="mt-2 text-sm text-gray-dark/85">
                  <span className="font-semibold">Name:</span> {detail.name}
                </p>
                <p className="text-sm text-gray-dark/85">
                  <span className="font-semibold">Email:</span> {detail.email}
                </p>
                <p className="text-sm text-gray-dark/85">
                  <span className="font-semibold">Phone:</span> {detail.phone}
                </p>
                <p className="text-sm text-gray-dark/85">
                  <span className="font-semibold">Service:</span> {formatServiceLabel(detail.service)}
                </p>
                <p className="text-sm text-gray-dark/85">
                  <span className="font-semibold">Status:</span>{" "}
                  {statusOptions.find((o) => o.value === detail.status)?.label ?? detail.status}
                </p>
                <p className="text-sm text-gray-dark/85">
                  <span className="font-semibold">Submitted:</span>{" "}
                  {formatDateTime(detail.createdAt)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 ring-1 ring-gray-medium/60">
                <p className="text-xs font-semibold tracking-wider text-green-dark">
                  Message
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-dark/85">
                  {formatBookingMessage(detail.message)}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDetail(null)}>
                Close
              </Button>
              <Button variant="secondary" onClick={() => remove(detail.id)} loading={loading}>
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
