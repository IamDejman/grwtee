"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
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

type Settings = { rules: Rules; fee: string; capacity: number | null };

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
  const styles: Record<Status, string> = {
    scheduled: "bg-gold/20 text-gray-dark",
    paid: "bg-green-600/10 text-green-700",
    cancelled: "bg-gray-medium/40 text-gray-dark/70"
  };
  const labels: Record<Status, string> = { scheduled: "Unpaid", paid: "Paid", cancelled: "Cancelled" };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-cream-light p-4 text-sm text-gray-dark/80">
      <p className="font-semibold text-green-dark">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-purple-dark">{value}</p>
    </div>
  );
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
    <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-gray-dark/70">{label}</dt>
          <dd className="whitespace-pre-line text-gray-dark">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SettingsForm({ initial, onSaved }: { initial: Settings; onSaved: () => void }) {
  const [fee, setFee] = useState(initial.fee);
  const [capacity, setCapacity] = useState(initial.capacity === null ? "" : String(initial.capacity));
  const [rules, setRules] = useState(initial.rules);
  const [noticeHours, setNoticeHours] = useState(String(initial.rules.minNoticeMinutes / 60));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const num = (v: string) => Number.parseInt(v, 10);
  const setRule = (key: keyof Rules, value: string) => setRules((r) => ({ ...r, [key]: num(value) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const body: Settings = {
        fee: fee.trim(),
        capacity: capacity.trim() ? num(capacity) : null,
        rules: { ...rules, weekdays: [...rules.weekdays].sort(), minNoticeMinutes: Math.round(Number(noticeHours) * 60) }
      };
      const res = await adminFetch("/api/admin/december/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      setMessage({ ok: true, text: "Saved. New times show on the booking page within a minute." });
      onSaved();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="grid max-w-3xl gap-8">
      <section className="grid gap-4 md:grid-cols-2">
        <Input
          label="Consultation fee"
          name="fee"
          autoComplete="off"
          placeholder="e.g. ₦50,000 / $40…"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
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
        <p className="text-xs text-gray-dark/70 md:col-span-2">
          The fee appears in confirmation emails with your active payment accounts. Leave it empty to leave payment out.
          Once capacity is reached, the booking page stops taking new bookings.
        </p>
      </section>

      <section>
        <h2 className="font-heading text-lg font-semibold text-purple-dark">Consultation times (Lagos time)</h2>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-gray-dark">Days</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((label, day) => {
              const on = rules.weekdays.includes(day);
              return (
                <label
                  key={label}
                  className={`relative cursor-pointer rounded-full border px-4 py-1.5 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold has-[:focus-visible]:ring-offset-2 ${
                    on ? "border-purple-dark bg-purple-dark text-white" : "border-gray-medium text-gray-dark"
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
        <p className="mt-3 text-xs text-gray-dark/70">
          Anything already in book@grwtee.com&apos;s Google Calendar is blocked automatically. To take a day off, add an
          all-day event there.
        </p>
      </section>

      <div className="flex items-center gap-4">
        <Button type="submit" loading={saving}>
          Save settings
        </Button>
        {message ? (
          <p role="status" className={`text-sm font-semibold ${message.ok ? "text-green-700" : "text-red-600"}`}>
            {message.text}
          </p>
        ) : null}
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
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminFetch("/api/admin/december");
      const json = (await res.json()) as { data?: Data };
      if (!res.ok || !json.data) throw new Error("Failed");
      setData(json.data);
    } catch {
      setError("Failed to load December bookings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (b: Booking, action: "paid" | "unpaid" | "cancel") => {
    setBusy(b.id);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/december/bookings/${b.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(null);
      setConfirmCancel(null);
      setDetail(null);
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
  const tabs: [Tab, string][] = [
    ["upcoming", `Upcoming (${upcoming.length})`],
    ["past", `Past and cancelled (${past.length})`],
    ["drafts", `Didn't book (${data?.drafts.length ?? 0})`],
    ["settings", "Settings"]
  ];

  const bookingTable = (rows: Booking[], empty: string) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-gray-medium/60 text-left text-xs font-semibold uppercase tracking-wider text-gray-dark/70">
            <th className="py-3 pr-4">Call (Lagos)</th>
            <th className="py-3 pr-4">Client</th>
            <th className="py-3 pr-4">Looks</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-medium/60">
          {rows.map((b) => (
            <tr key={b.id}>
              <td className="py-3 pr-4 tabular-nums text-gray-dark">{lagosSlot(b.slotStart)}</td>
              <td className="py-3 pr-4">
                <p className="font-semibold text-purple-medium">{b.name}</p>
                <p className="text-xs text-gray-dark/70">
                  {b.email} ·{" "}
                  <a className="underline" href={whatsappLink(b.whatsapp)} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </p>
              </td>
              <td className="py-3 pr-4 tabular-nums">{b.looks}</td>
              <td className="py-3 pr-4">
                <StatusPill status={b.status} />
              </td>
              <td className="py-3 pr-4">
                <div className="flex flex-wrap gap-3 text-xs font-semibold">
                  <button type="button" className="text-green-dark hover:text-purple-dark" onClick={() => setDetail(b)}>
                    View brief
                  </button>
                  {b.status === "scheduled" ? (
                    <button type="button" className="text-green-dark hover:text-purple-dark disabled:opacity-50" disabled={busy === b.id} onClick={() => act(b, "paid")}>
                      Mark paid
                    </button>
                  ) : null}
                  {b.status === "paid" ? (
                    <button type="button" className="text-gray-dark/70 hover:text-purple-dark disabled:opacity-50" disabled={busy === b.id} onClick={() => act(b, "unpaid")}>
                      Mark unpaid
                    </button>
                  ) : null}
                  {b.status !== "cancelled" && Date.parse(b.slotStart) > Date.now() ? (
                    <button type="button" className="text-red-600 hover:text-red-700 disabled:opacity-50" disabled={busy === b.id} onClick={() => setConfirmCancel(b)}>
                      Cancel
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td className="py-4 text-gray-dark/70" colSpan={5}>
                {empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-purple-dark">Lagos in December</h1>
          <p className="mt-2 text-sm text-gray-dark/80">
            Consultations booked through /december, people who started but didn&apos;t book, and booking settings.
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      {data && data.mode !== "live" ? (
        <p className="mt-4 rounded-lg bg-gold/15 p-4 text-sm text-gray-dark" role="status">
          {data.mode === "off"
            ? "Google Calendar isn't connected, so the booking page can't take bookings yet."
            : "Test mode: Google Calendar isn't connected. Bookings are saved without calendar events or emails."}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Upcoming calls" value={upcoming.length} />
          <Stat label="Awaiting payment" value={unpaid} />
          <Stat label="Didn't book" value={data.drafts.length} />
          <Stat label="Capacity" value={data.settings.capacity === null ? `${data.active} booked` : `${data.active} of ${data.settings.capacity}`} />
        </div>
      ) : null}

      <div className="mt-6 rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-medium/60">
        <div aria-label="December views" className="flex flex-wrap gap-2 border-b border-gray-medium/60 pb-4">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                tab === key ? "bg-purple-dark text-white" : "text-gray-dark/80 hover:bg-purple-dark/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {!data ? (
            <p className="text-sm text-gray-dark/70">{error ? "-" : "Loading…"}</p>
          ) : tab === "upcoming" ? (
            bookingTable(upcoming, "No upcoming consultations yet.")
          ) : tab === "past" ? (
            bookingTable(past, "Nothing here yet.")
          ) : tab === "drafts" ? (
            <div className="overflow-x-auto">
              <p className="mb-4 text-sm text-gray-dark/80">
                People who gave their contact details but haven&apos;t booked. Drafts are deleted after 90 days.
              </p>
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-gray-medium/60 text-left text-xs font-semibold uppercase tracking-wider text-gray-dark/70">
                    <th className="py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Reached</th>
                    <th className="py-3 pr-4">Last active</th>
                    <th className="py-3 pr-4">Follow up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-medium/60">
                  {data.drafts.map((d) => (
                    <tr key={d.id}>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-purple-medium">{d.name}</p>
                        <p className="text-xs text-gray-dark/70">{d.email}</p>
                      </td>
                      <td className="py-3 pr-4">{STEP_LABELS[d.step] ?? d.step}</td>
                      <td className="py-3 pr-4 tabular-nums text-gray-dark/80">{shortDate(d.updatedAt)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-3 text-xs font-semibold">
                          <a
                            className="text-green-dark hover:text-purple-dark"
                            href={whatsappLink(
                              d.whatsapp,
                              `Hi ${firstName(d.name)}, it's GRWTEE. We saw you started your Lagos in December brief. Would you like help choosing a consultation time?`
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            WhatsApp
                          </a>
                          <a className="text-green-dark hover:text-purple-dark" href={`mailto:${d.email}`}>
                            Email
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!data.drafts.length ? (
                    <tr>
                      <td className="py-4 text-gray-dark/70" colSpan={4}>
                        No one has dropped off yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : (
            <SettingsForm initial={data.settings} onSaved={load} />
          )}
        </div>
      </div>

      <Modal open={detail !== null} onClose={() => setDetail(null)}>
        {detail ? (
          <div>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="font-heading text-xl font-semibold text-purple-dark">{detail.name}</h2>
              <StatusPill status={detail.status} />
            </div>
            <BriefDetail b={detail} />
          </div>
        ) : null}
      </Modal>

      <Modal open={confirmCancel !== null} onClose={() => setConfirmCancel(null)}>
        {confirmCancel ? (
          <div>
            <h2 className="font-heading text-xl font-semibold text-purple-dark">Cancel {confirmCancel.name}&apos;s consultation?</h2>
            <p className="mt-3 text-sm text-gray-dark/80">
              {lagosSlot(confirmCancel.slotStart)} Lagos time. The calendar event is deleted and Google emails the client
              a cancellation. The time opens up for someone else.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => setConfirmCancel(null)}>
                Keep it
              </Button>
              <Button loading={busy === confirmCancel.id} onClick={() => act(confirmCancel, "cancel")}>
                Cancel consultation
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
