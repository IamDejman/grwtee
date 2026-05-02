"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";

type WaitlistEntry = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

const PAGE_SIZE = 20;

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(p: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/waitlist?page=${p}`);
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
    load(page);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-dark/60">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-dark/60">
                  No signups yet.
                </td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-gray-medium/30">
                <td className="px-4 py-3 font-medium text-gray-dark">{e.email}</td>
                <td className="px-4 py-3 text-gray-dark/80">{e.name || "-"}</td>
                <td className="px-4 py-3 text-gray-dark/80">{formatDate(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-dark/70">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-full border border-gray-medium/60 bg-white px-4 py-1.5 font-medium transition hover:bg-cream-light disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-full border border-gray-medium/60 bg-white px-4 py-1.5 font-medium transition hover:bg-cream-light disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
