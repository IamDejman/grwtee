"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { adminFetch } from "@/lib/adminFetch";

type Subscriber = {
  id: string;
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

type Broadcast = {
  id: string;
  subject: string;
  sentAt: string | null;
  sentCount: number;
  failedCount: number;
  createdAt: string;
};

type Counts = { confirmed: number; pending: number; unsubscribed: number };

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "unsubscribed", label: "Unsubscribed" }
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function MailingListPage() {
  const [tab, setTab] = useState<"subscribers" | "broadcasts">("subscribers");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState<Counts>({ confirmed: 0, pending: 0, unsubscribed: 0 });
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSubscribers() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/subscribers${status ? `?status=${status}` : ""}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load");
      setSubscribers(data.data);
      setCounts(data.counts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadBroadcasts() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/broadcasts");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load");
      setBroadcasts(data.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "subscribers") loadSubscribers();
    else loadBroadcasts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status]);

  async function deleteSubscriber(id: string) {
    if (!confirm("Delete this subscriber?")) return;
    const res = await adminFetch(`/api/admin/subscribers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    } else {
      alert("Failed to delete");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">
            Mailing list
          </h1>
          <p className="mt-1 text-sm text-gray-dark/70">
            Manage subscribers and send broadcasts.
          </p>
        </div>
        <Link href="/admin/mailing-list/new">
          <Button>New broadcast</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-4 border-b border-gray-medium/40">
        <button
          onClick={() => setTab("subscribers")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
            tab === "subscribers"
              ? "border-purple-medium text-purple-dark"
              : "border-transparent text-gray-dark/60 hover:text-gray-dark"
          }`}
        >
          Subscribers
        </button>
        <button
          onClick={() => setTab("broadcasts")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
            tab === "broadcasts"
              ? "border-purple-medium text-purple-dark"
              : "border-transparent text-gray-dark/60 hover:text-gray-dark"
          }`}
        >
          Broadcasts
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {tab === "subscribers" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-3 text-sm text-gray-dark">
              <span className="rounded-full bg-green-dark/10 px-3 py-1 font-medium text-green-dark">
                {counts.confirmed} confirmed
              </span>
              <span className="rounded-full bg-gold-light/20 px-3 py-1 font-medium text-purple-dark">
                {counts.pending} pending
              </span>
              <span className="rounded-full bg-gray-medium/20 px-3 py-1 font-medium text-gray-dark">
                {counts.unsubscribed} unsubscribed
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-44"
                options={statusOptions}
              />
              <a
                href="/api/admin/subscribers/export"
                className="inline-flex items-center rounded-full border border-gray-medium/60 bg-white px-4 py-2 text-sm font-medium text-gray-dark transition hover:bg-cream-light"
              >
                Export CSV
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-medium/40 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-cream-light text-left text-xs uppercase tracking-wider text-gray-dark/60">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Subscribed</th>
                  <th className="px-4 py-3">Confirmed</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-dark/60">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && subscribers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-dark/60">
                      No subscribers.
                    </td>
                  </tr>
                )}
                {subscribers.map((s) => (
                  <tr key={s.id} className="border-t border-gray-medium/30">
                    <td className="px-4 py-3 font-medium text-gray-dark">{s.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          s.status === "confirmed"
                            ? "bg-green-dark/10 text-green-dark"
                            : s.status === "pending"
                            ? "bg-gold-light/30 text-purple-dark"
                            : "bg-gray-medium/20 text-gray-dark"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-dark/80">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-dark/80">{formatDate(s.confirmedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteSubscriber(s.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "broadcasts" && (
        <div className="overflow-hidden rounded-lg border border-gray-medium/40 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cream-light text-left text-xs uppercase tracking-wider text-gray-dark/60">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Recipients</th>
                <th className="px-4 py-3">Failed</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-dark/60">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && broadcasts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-dark/60">
                    No broadcasts yet.
                  </td>
                </tr>
              )}
              {broadcasts.map((b) => (
                <tr key={b.id} className="border-t border-gray-medium/30">
                  <td className="px-4 py-3 font-medium text-gray-dark">{b.subject}</td>
                  <td className="px-4 py-3 text-gray-dark/80">{formatDate(b.sentAt)}</td>
                  <td className="px-4 py-3 text-gray-dark/80">{b.sentCount}</td>
                  <td
                    className={`px-4 py-3 ${
                      b.failedCount > 0 ? "text-red-600" : "text-gray-dark/80"
                    }`}
                  >
                    {b.failedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
