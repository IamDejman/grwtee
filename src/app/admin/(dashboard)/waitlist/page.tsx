"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";
import { EmptyState, PageHeader, Panel, SkeletonRows, Stat } from "@/components/admin/ui";

type WaitlistEntry = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const PAGE_SIZE = 20;

const pillLink =
  "inline-flex items-center rounded-full border border-atelier-border bg-white px-4 py-2 text-sm font-medium text-atelier-ink transition hover:bg-atelier-canvas";

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
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
    } catch {
      setError("Couldn't load the waitlist. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(page);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Inner Circle waitlist"
        actions={
          // API download route, not a page: a full navigation is required
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a href="/api/admin/waitlist/export" className={pillLink}>
            Export CSV
          </a>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="On the list" value={total} />
      </div>

      <Panel className="!p-0 sm:!p-0">
        {loading && !entries.length ? (
          <div className="p-5">
            <SkeletonRows />
          </div>
        ) : !entries.length ? (
          <EmptyState icon={Sparkles} title="No signups yet." />
        ) : (
          <ul className="divide-y divide-atelier-border/70">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
                <div className="min-w-0">
                  <p className="font-medium text-atelier-ink [overflow-wrap:anywhere]">{e.email}</p>
                  {e.name ? <p className="text-sm text-atelier-muted">{e.name}</p> : null}
                </div>
                <p className="shrink-0 text-sm text-atelier-faint">{formatDate(e.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-atelier-muted">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={`${pillLink} disabled:opacity-40`}>
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`${pillLink} disabled:opacity-40`}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
