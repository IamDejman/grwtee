"use client";

import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { Badge, EmptyState, FilterChips, PageHeader, Panel, RowAction, SkeletonRows, Stat, type Tone } from "@/components/admin/ui";
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

type StatusFilter = "" | Subscriber["status"];

const STATUS: Record<Subscriber["status"], { label: string; tone: Tone }> = {
  confirmed: { label: "Confirmed", tone: "green" },
  pending: { label: "Awaiting confirmation", tone: "gold" },
  unsubscribed: { label: "Unsubscribed", tone: "neutral" }
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const pillLink =
  "inline-flex items-center rounded-full border border-atelier-border bg-white px-4 py-2 text-sm font-medium text-atelier-ink transition hover:bg-atelier-canvas";

export default function MailingListPage() {
  const [tab, setTab] = useState<"subscribers" | "broadcasts">("subscribers");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState<Counts>({ confirmed: 0, pending: 0, unsubscribed: 0 });
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [status, setStatus] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

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
      console.error("[Mailing list] load failed", e);
      setError("Couldn't load subscribers. Refresh to try again.");
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
      console.error("[Mailing list] broadcasts failed", e);
      setError("Couldn't load broadcasts. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "subscribers") void loadSubscribers();
    else void loadBroadcasts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status]);

  async function deleteSubscriber(id: string) {
    const email = subscribers.find((s) => s.id === id)?.email ?? "this subscriber";
    const ok = await confirm({ title: `Delete ${email}?`, body: "This can't be undone.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const res = await adminFetch(`/api/admin/subscribers/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      toast.success(`${email} deleted.`);
    } else {
      toast.error(`Couldn't delete ${email}. Try again.`);
    }
  }

  const statusBadge = (s: Subscriber) => <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>;
  const total = counts.confirmed + counts.pending + counts.unsubscribed;

  return (
    <div>
      <PageHeader
        title="Mailing list"
        actions={
          <ButtonLink href="/admin/mailing-list/new" size="sm">
            New broadcast
          </ButtonLink>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Confirmed" value={counts.confirmed} />
        <Stat label="Awaiting" value={counts.pending} tone={counts.pending ? "gold" : undefined} />
        <Stat label="Unsubscribed" value={counts.unsubscribed} />
      </div>

      <div className="mb-4">
        <FilterChips
          label="Mailing list views"
          value={tab}
          onChange={setTab}
          options={[
            { value: "subscribers", label: "Subscribers" },
            { value: "broadcasts", label: "Broadcasts" }
          ]}
        />
      </div>

      {tab === "subscribers" ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterChips
              label="Filter by status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "", label: "All", count: total },
                { value: "confirmed", label: "Confirmed", count: counts.confirmed },
                { value: "pending", label: "Awaiting", count: counts.pending },
                { value: "unsubscribed", label: "Unsubscribed", count: counts.unsubscribed }
              ]}
            />
            {/* API download route, not a page: a full navigation is required */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/admin/subscribers/export" className={`${pillLink} self-start`}>
              Export CSV
            </a>
          </div>

          <Panel className="!p-0 sm:!p-0">
            {loading && !subscribers.length ? (
              <div className="p-5">
                <SkeletonRows />
              </div>
            ) : !subscribers.length ? (
              <EmptyState icon={Mail} title="No subscribers here." />
            ) : (
              <ul className="divide-y divide-atelier-border/70">
                {subscribers.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-atelier-ink [overflow-wrap:anywhere]">{s.email}</p>
                      <p className="text-sm text-atelier-faint">Joined {formatDate(s.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(s)}
                      <RowAction danger onClick={() => void deleteSubscriber(s.id)}>
                        Delete
                      </RowAction>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      ) : (
        <Panel className="!p-0 sm:!p-0">
          {loading && !broadcasts.length ? (
            <div className="p-5">
              <SkeletonRows />
            </div>
          ) : !broadcasts.length ? (
            <EmptyState
              icon={Send}
              title="No broadcasts yet."
              action={
                <ButtonLink href="/admin/mailing-list/new" size="sm" variant="outline">
                  Write one
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-atelier-border/70">
              {broadcasts.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-atelier-ink">{b.subject}</p>
                    <p className="text-sm text-atelier-faint">{b.sentAt ? `Sent ${formatDate(b.sentAt)}` : "Not sent"}</p>
                  </div>
                  <p className="text-sm tabular-nums text-atelier-muted">
                    {b.sentCount} delivered
                    {b.failedCount > 0 ? <span className="text-red-600"> · {b.failedCount} failed</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
      {dialog}
    </div>
  );
}
