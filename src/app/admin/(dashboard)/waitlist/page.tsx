"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";

type WaitlistEntry = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  createdAt: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/waitlist");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load");
      setEntries(data.data);
      setTotal(data.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteEntry(id: string) {
    if (!confirm("Remove this entry from the waitlist?")) return;
    const res = await adminFetch(`/api/admin/waitlist/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setTotal((t) => t - 1);
    } else {
      alert("Failed to delete");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">
            Inner Circle waitlist
          </h1>
          <p className="mt-1 text-sm text-gray-dark/70">
            Mobile app waiting list signups.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-purple-dark/10 px-3 py-1 text-sm font-medium text-purple-dark">
          {total} on the list
        </span>
        <a
          href="/api/admin/waitlist/export"
          className="ml-auto inline-flex items-center rounded-full border border-gray-medium/60 bg-white px-4 py-2 text-sm font-medium text-gray-dark transition hover:bg-cream-light"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-medium/40 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream-light text-left text-xs uppercase tracking-wider text-gray-dark/60">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Joined</th>
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
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-dark/60">
                  No signups yet.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-gray-medium/30">
                <td className="px-4 py-3 font-medium text-gray-dark">{e.email}</td>
                <td className="px-4 py-3 text-gray-dark/80">{e.name || "-"}</td>
                <td className="px-4 py-3 text-gray-dark/80">{e.source || "-"}</td>
                <td className="px-4 py-3 text-gray-dark/80">{formatDate(e.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteEntry(e.id)}
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
  );
}
