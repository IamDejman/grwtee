"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/admin/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { Badge, EmptyState, FilterChips, PageHeader, Panel, RowAction, SkeletonRows, Stat, type Tone } from "@/components/admin/ui";
import { adminFetch } from "@/lib/adminFetch";
import { formatSlot, whatsappLink } from "@/lib/december/format";

type Status = "scheduled" | "paid" | "cancelled";

type Booking = {
  id: string;
  status: Status;
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  occasions: string[];
  otherOccasion: string | null;
  looks: number;
  events: { day: number; title: string }[];
  plans: string | null;
  styleWords: string[];
  styleNotes: string | null;
  styleLinks: string[];
  comments: string | null;
  timezone: string;
  slotStart: string;
  meetUrl: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

type Draft = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  step: string;
  updatedAt: string;
};

type Rules = {
  weekdays: number[];
  startHour: number;
  endHour: number;
  slotMinutes: number;
  minNoticeMinutes: number;
  windowDays: number;
};

type Settings = { rules: Rules; feeNgn: number | null; feeUsd: number | null; capacity: number | null };

type Data = {
  bookings: Booking[];
  drafts: Draft[];
  settings: Settings;
  active: number;
  mode: "live" | "dry-run" | "off";
};

type Tab = "upcoming" | "past" | "drafts" | "settings";

const LAGOS = "Africa/Lagos";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STEP_LABELS: Record<string, string> = {
  occasions: "Occasions",
  looks: "Looks",
  timeline: "December dates",
  style: "Style",
  brief: "Brief review",
  time: "Choosing a time"
};

const lagosSlot = (iso: string) => {
  const { day, time } = formatSlot(new Date(iso), LAGOS);
  return `${day}, ${time}`;
};

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: LAGOS }).format(
    new Date(iso)
  );

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

function StatusPill({ status }: { status: Status }) {
  const tones: Record<Status, Tone> = { scheduled: "gold", paid: "green", cancelled: "neutral" };
  const labels: Record<Status, string> = { scheduled: "Unpaid", paid: "Paid", cancelled: "Cancelled" };
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}

function BriefDetail({ b }: { b: Booking }) {
  const occasions = b.occasions.map((o) => (o === "Other" && b.otherOccasion ? b.otherOccasion : o)).join(", ");
  const rows: [string, React.ReactNode][] = [
    ["Call", `${lagosSlot(b.slotStart)} Lagos (client in ${b.timezone})`],
    ["Email", <a key="e" className="underline" href={`mailto:${b.email}`}>{b.email}</a>],
    ["WhatsApp", <a key="w" className="underline" href={whatsappLink(b.whatsapp)} target="_blank" rel="noreferrer">{b.whatsapp}</a>],
    ["Looks", String(b.looks)],
    ["Occasions", occasions || "-"],
    ["December dates", b.events.length ? b.events.map((e) => `${e.day} Dec: ${e.title}`).join("\n") : "-"],
    ["Plans", b.plans || "-"],
    ["Style", b.styleWords.join(", ") || "-"],
    ["Style notes", b.styleNotes || "-"],
    [
      "References",
      b.styleLinks.length ? (
        <span key="l" className="flex flex-col">
          {b.styleLinks.map((l) => (
            <a key={l} className="break-all underline" href={l} target="_blank" rel="noreferrer">
              {l}
            </a>
          ))}
        </span>
      ) : (
        "-"
      )
    ],
    ["Comments", b.comments || "-"],
    ["Meet", b.meetUrl ? <a key="m" className="underline" href={b.meetUrl} target="_blank" rel="noreferrer">{b.meetUrl}</a> : "-"],
    ["Booked", shortDate(b.createdAt)],
    ["Paid", b.paidAt ? shortDate(b.paidAt) : "-"]
  ];
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[8rem_1fr] sm:gap-y-3">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="mt-3 text-xs font-medium uppercase tracking-wider text-atelier-faint sm:mt-0.5">{label}</dt>
          <dd className="whitespace-pre-line text-atelier-ink [overflow-wrap:anywhere] [&_a]:text-purple-dark">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SettingsForm({ initial, onSaved }: { initial: Settings; onSaved: () => void }) {
  const toast = useToast();
  const text = (n: number | null) => (n === null ? "" : String(n));
  const [feeNgn, setFeeNgn] = useState(text(initial.feeNgn));
  const [feeUsd, setFeeUsd] = useState(text(initial.feeUsd));
  const [capacity, setCapacity] = useState(text(initial.capacity));
  const [rules, setRules] = useState(initial.rules);
  const [noticeHours, setNoticeHours] = useState(String(initial.rules.minNoticeMinutes / 60));
  const [saving, setSaving] = useState(false);

  const num = (v: string) => Number.parseInt(v, 10);
  const optional = (v: string) => (v.trim() ? num(v.replace(/[^\d]/g, "")) : null);
  const setRule = (key: keyof Rules, value: string) => setRules((r) => ({ ...r, [key]: num(value) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Settings = {
        feeNgn: optional(feeNgn),
        feeUsd: optional(feeUsd),
        capacity: optional(capacity),
        rules: { ...rules, weekdays: [...rules.weekdays].sort(), minNoticeMinutes: Math.round(Number(noticeHours) * 60) }
      };
      const res = await adminFetch("/api/admin/december/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      toast.success("Settings saved.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="grid max-w-3xl gap-8">
      <section className="grid gap-4 md:grid-cols-3">
        <Input
          label="Fee in naira"
          name="feeNgn"
          autoComplete="off"
          inputMode="numeric"
          adornment="₦"
          placeholder="50000"
          value={feeNgn}
          onChange={(e) => setFeeNgn(e.target.value)}
        />
        <Input
          label="Fee in dollars"
          name="feeUsd"
          autoComplete="off"
          inputMode="numeric"
          adornment="$"
          placeholder="40"
          value={feeUsd}
          onChange={(e) => setFeeUsd(e.target.value)}
        />
        <Input
          label="December capacity (clients)"
          name="capacity"
          autoComplete="off"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="No limit"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </section>

      <section>
        <h2 className="font-cormorant text-2xl font-medium text-atelier-ink">Consultation times (Lagos time)</h2>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-gray-dark">Days</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((label, day) => {
              const on = rules.weekdays.includes(day);
              return (
                <label
                  key={label}
                  className={`relative cursor-pointer rounded-full border px-4 py-1.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold has-[:focus-visible]:ring-offset-2 ${
                    on ? "border-atelier-ink bg-atelier-ink text-white" : "border-atelier-border bg-white text-atelier-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    checked={on}
                    onChange={() =>
                      setRules((r) => ({
                        ...r,
                        weekdays: on ? r.weekdays.filter((d) => d !== day) : [...r.weekdays, day]
                      }))
                    }
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Input label="First call starts (hour)" name="startHour" autoComplete="off" type="number" min={0} max={23} value={rules.startHour} onChange={(e) => setRule("startHour", e.target.value)} />
          <Input label="Day ends (hour)" name="endHour" autoComplete="off" type="number" min={1} max={24} value={rules.endHour} onChange={(e) => setRule("endHour", e.target.value)} />
          <Input label="Call length (minutes)" name="slotMinutes" autoComplete="off" type="number" min={15} max={120} step={15} value={rules.slotMinutes} onChange={(e) => setRule("slotMinutes", e.target.value)} />
          <Input label="Minimum notice (hours)" name="minNoticeHours" autoComplete="off" type="number" min={0} step={0.5} value={noticeHours} onChange={(e) => setNoticeHours(e.target.value)} />
          <Input label="Book up to (days ahead)" name="windowDays" autoComplete="off" type="number" min={1} max={180} value={rules.windowDays} onChange={(e) => setRule("windowDays", e.target.value)} />
        </div>
      </section>

      <div>
        <Button type="submit" size="sm" loading={saving}>
          Save settings
        </Button>
      </div>
    </form>
  );
}

export default function AdminDecemberPage() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminFetch("/api/admin/december");
      const json = (await res.json()) as { data?: Data };
      if (!res.ok || !json.data) throw new Error("Failed");
      setData(json.data);
    } catch {
      setError("Couldn't load December bookings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (b: Booking, action: "paid" | "unpaid" | "cancel") => {
    if (action === "cancel") {
      const ok = await confirm({
        title: `Cancel ${b.name}'s consultation?`,
        body: `${lagosSlot(b.slotStart)} Lagos time. The calendar event is deleted, Google emails ${firstName(b.name)} a cancellation and the time opens up again.`,
        confirmLabel: "Cancel consultation",
        danger: true
      });
      if (!ok) return;
    }
    setBusy(b.id);
    try {
      const res = await adminFetch(`/api/admin/december/bookings/${b.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed.");
      await load();
      setDetail(null);
      toast.success(
        action === "paid"
          ? `${firstName(b.name)} marked paid.`
          : action === "unpaid"
            ? `${firstName(b.name)} marked unpaid.`
            : `${firstName(b.name)}'s consultation cancelled.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  };

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const all = data?.bookings ?? [];
    return {
      upcoming: all.filter((b) => b.status !== "cancelled" && Date.parse(b.slotStart) >= now - 30 * 60_000),
      past: all
        .filter((b) => b.status === "cancelled" || Date.parse(b.slotStart) < now - 30 * 60_000)
        .reverse()
    };
  }, [data]);

  const unpaid = upcoming.filter((b) => b.status === "scheduled").length;
  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "upcoming", label: "Upcoming", count: upcoming.length },
    { value: "past", label: "Past and cancelled", count: past.length },
    { value: "drafts", label: "Didn't book", count: data?.drafts.length ?? 0 },
    { value: "settings", label: "Settings" }
  ];

  const bookingActions = (b: Booking) => (
    <div className="-ml-2.5 flex flex-wrap items-center gap-1">
      <RowAction onClick={() => setDetail(b)}>Brief</RowAction>
      {b.status === "scheduled" ? (
        <RowAction disabled={busy === b.id} onClick={() => void act(b, "paid")}>
          Mark paid
        </RowAction>
      ) : null}
      {b.status === "paid" ? (
        <RowAction disabled={busy === b.id} onClick={() => void act(b, "unpaid")}>
          Mark unpaid
        </RowAction>
      ) : null}
      <a
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-purple-dark hover:bg-atelier-lavender"
        href={whatsappLink(b.whatsapp)}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp
      </a>
      {b.status !== "cancelled" && Date.parse(b.slotStart) > Date.now() ? (
        <RowAction danger disabled={busy === b.id} onClick={() => void act(b, "cancel")}>
          Cancel
        </RowAction>
      ) : null}
    </div>
  );

  const draftActions = (d: Draft) => (
    <div className="-ml-2.5 flex flex-wrap gap-1">
      <a
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-purple-dark hover:bg-atelier-lavender"
        href={whatsappLink(
          d.whatsapp,
          `Hi ${firstName(d.name)}, it's GRWTEE. We saw you started your Lagos in December brief. Would you like help choosing a consultation time?`
        )}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp
      </a>
      <a className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-purple-dark hover:bg-atelier-lavender" href={`mailto:${d.email}`}>
        Email
      </a>
    </div>
  );

  const bookingTable = (rows: Booking[], empty: string) =>
    !rows.length ? (
      <EmptyState icon={Sparkles} title={empty} />
    ) : (
      <>
        {/* Phones: one card per booking. */}
        <ul className="divide-y divide-atelier-border/70 md:hidden">
          {rows.map((b) => (
            <li key={b.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-atelier-ink">{b.name}</p>
                  <p className="mt-0.5 text-sm tabular-nums text-atelier-muted">{lagosSlot(b.slotStart)} Lagos</p>
                </div>
                <StatusPill status={b.status} />
              </div>
              <p className="mt-1 text-xs text-atelier-faint">{b.looks} looks</p>
              <div className="mt-2">{bookingActions(b)}</div>
            </li>
          ))}
        </ul>
        <div className="hidden px-6 pb-2 pt-5 md:block">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Call (Lagos)</th>
                <th>Client</th>
                <th>Looks</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td className="whitespace-nowrap tabular-nums">{lagosSlot(b.slotStart)}</td>
                  <td>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-atelier-faint">{b.email}</p>
                  </td>
                  <td className="tabular-nums text-atelier-muted">{b.looks}</td>
                  <td>
                    <StatusPill status={b.status} />
                  </td>
                  <td>{bookingActions(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );

  return (
    <div>
      <PageHeader title="Lagos in December" />

      {data && data.mode !== "live" ? (
        <p className="mb-4 rounded-xl bg-gold/15 px-4 py-3 text-sm text-atelier-ink" role="status">
          {data.mode === "off"
            ? "Google Calendar isn't connected, so the booking page can't take bookings yet."
            : "Test mode: Google Calendar isn't connected. Bookings are saved without calendar events or emails."}
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Upcoming calls" value={upcoming.length} />
          <Stat label="Awaiting payment" value={unpaid} tone={unpaid ? "gold" : undefined} />
          <Stat label="Didn't book" value={data.drafts.length} />
          <Stat
            label="Booked"
            value={data.settings.capacity === null ? data.active : `${data.active} / ${data.settings.capacity}`}
          />
        </div>
      ) : null}

      <div className="mb-4">
        <FilterChips label="December views" value={tab} options={tabs} onChange={setTab} />
      </div>

      <Panel className={tab === "settings" ? "" : "!p-0 sm:!p-0"}>
        {!data ? (
          error ? (
            <EmptyState title="-" />
          ) : (
            <div className="p-5">
              <SkeletonRows />
            </div>
          )
        ) : tab === "upcoming" ? (
          bookingTable(upcoming, "No upcoming consultations yet.")
        ) : tab === "past" ? (
          bookingTable(past, "Nothing here yet.")
        ) : tab === "drafts" ? (
          !data.drafts.length ? (
            <EmptyState icon={Sparkles} title="No one has dropped off." />
          ) : (
            <>
              <ul className="divide-y divide-atelier-border/70 md:hidden">
                {data.drafts.map((d) => (
                  <li key={d.id} className="px-4 py-4">
                    <p className="font-medium text-atelier-ink">{d.name}</p>
                    <p className="mt-0.5 text-sm text-atelier-muted">
                      Reached {STEP_LABELS[d.step] ?? d.step} · {shortDate(d.updatedAt)}
                    </p>
                    <div className="mt-2">{draftActions(d)}</div>
                  </li>
                ))}
              </ul>
              <div className="hidden px-6 pb-2 pt-5 md:block">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Reached</th>
                      <th>Last active</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.drafts.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <p className="font-medium">{d.name}</p>
                          <p className="text-xs text-atelier-faint">{d.email}</p>
                        </td>
                        <td className="text-atelier-muted">{STEP_LABELS[d.step] ?? d.step}</td>
                        <td className="whitespace-nowrap tabular-nums text-atelier-muted">{shortDate(d.updatedAt)}</td>
                        <td>{draftActions(d)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          <SettingsForm initial={data.settings} onSaved={load} />
        )}
      </Panel>

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.name}>
        {detail ? (
          <div>
            <div className="mb-6">
              <StatusPill status={detail.status} />
            </div>
            <BriefDetail b={detail} />
          </div>
        ) : null}
      </Modal>
      {dialog}
    </div>
  );
}
