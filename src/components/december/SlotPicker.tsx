"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { EASE } from "./primitives";

export type SlotDays = [string, string[]][];

export function viewerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos";
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(
    new Date(iso)
  );
}

export function formatDay(iso: string, timeZone: string, month: "short" | "long" = "long"): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month, timeZone }).format(
    new Date(iso)
  );
}

/** Same wall-clock time as Lagos for every slot shown? DST elsewhere can differ month to month. */
export function matchesLagos(slots: string[], tz: string): boolean {
  return slots.every((s) => formatTime(s, tz) === formatTime(s, "Africa/Lagos"));
}

type SlotState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; days: SlotDays };

async function fetchSlots(): Promise<SlotDays> {
  const res = await fetch("/api/december/slots", { cache: "no-store" });
  const json = (await res.json()) as { success?: boolean; days?: SlotDays };
  if (!res.ok || !json.success || !json.days) throw new Error(`slots ${res.status}`);
  return json.days;
}

/** Open times from the server (booking rules + Google Calendar). `reload` returns the fresh days. */
export function useSlots() {
  const [state, setState] = useState<SlotState>({ status: "loading" });

  const reload = useCallback(async (): Promise<SlotDays | null> => {
    setState((s) => (s.status === "ready" ? s : { status: "loading" }));
    try {
      const days = await fetchSlots();
      setState({ status: "ready", days });
      return days;
    } catch {
      setState({ status: "error" });
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchSlots()
      .then((days) => active && setState({ status: "ready", days }))
      .catch(() => active && setState({ status: "error" }));
    return () => {
      active = false;
    };
  }, []);

  return { state, reload };
}

/** The open time closest to `target`, preferring the same day. */
export function nearestSlot(days: SlotDays, target: string): string | null {
  const t = Date.parse(target);
  let best: string | null = null;
  for (const [, slots] of days) {
    for (const s of slots) {
      if (best === null || Math.abs(Date.parse(s) - t) < Math.abs(Date.parse(best) - t)) best = s;
    }
  }
  return best;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "YYYY-MM-DD" of an instant in a time zone. */
function localDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(
    new Date(iso)
  );
}

function monthTitle(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1))
  );
}

/** Calendar cells for a "YYYY-MM" month, Monday first; null pads the first week. */
function monthCells(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)
  ];
}

function Arrow({ dir }: { dir: -1 | 1 }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={dir === -1 ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Skeleton() {
  return (
    <div aria-hidden="true">
      <div className="h-6 w-40 rounded bg-night-raised" />
      <div className="mt-5 grid max-w-md grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }, (_, i) => (
          <motion.span
            key={i}
            className="aspect-square rounded-lg bg-night-raised"
            animate={{ opacity: [0.35, 0.8, 0.35] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: (i % 7) * 0.05 }}
          />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <motion.span
            key={i}
            className="h-[3.75rem] rounded-xl bg-night-raised"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: 0.2 + i * 0.05 }}
          />
        ))}
      </div>
    </div>
  );
}

export function SlotPicker({
  state,
  onRetry,
  value,
  onChange,
  tz
}: {
  state: SlotState;
  onRetry: () => void;
  value: string | null;
  onChange: (slot: string) => void;
  tz: string;
}) {
  const days = state.status === "ready" ? state.days : [];
  const valueDay = days.find(([, slots]) => value && slots.includes(value))?.[0];
  const [pickedDay, setPickedDay] = useState<string | undefined>();
  const [monthDir, setMonthDir] = useState(1);
  // The day the client tapped, else the day of the selected time, else the first open day.
  const day = (days.some(([d]) => d === pickedDay) ? pickedDay : undefined) ?? valueDay ?? days[0]?.[0];
  const slots = days.find(([d]) => d === day)?.[1] ?? [];
  const isLagos = matchesLagos(slots, tz);
  const slotsByDay = new Map(days);
  const months = [...new Set(days.map(([d]) => d.slice(0, 7)))];
  const month = day?.slice(0, 7) ?? months[0];
  const monthIndex = months.indexOf(month);
  const goMonth = (step: -1 | 1) => {
    const target = months[monthIndex + step];
    if (!target) return;
    setMonthDir(step);
    setPickedDay(days.find(([d]) => d.startsWith(target))?.[0]);
  };

  if (state.status === "loading") {
    return (
      <>
        <p className="sr-only" role="status">
          Loading open times…
        </p>
        <Skeleton />
      </>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-night-line p-5 font-body text-base text-lilac" role="alert">
        We couldn&apos;t load open times.{" "}
        <button type="button" onClick={onRetry} className="text-gold underline underline-offset-4 hover:text-gold-light">
          Try again
        </button>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <p className="font-body text-base text-lilac">
        There are no open times right now. Email book@grwtee.com and we&apos;ll find one for you.
      </p>
    );
  }

  return (
    <>
      <div className="max-w-md">
        <div className="flex items-center justify-between">
          <p className="font-cormorant text-2xl text-cream" aria-live="polite">
            {monthTitle(month)}
          </p>
          {months.length > 1 ? (
            <div className="flex gap-1">
              {([-1, 1] as const).map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => goMonth(step)}
                  disabled={!months[monthIndex + step]}
                  aria-label={step === -1 ? "Previous month" : "Next month"}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-night-line text-lilac transition-colors hover:border-gold/60 hover:text-cream disabled:opacity-30 disabled:hover:border-night-line disabled:hover:text-lilac"
                >
                  <Arrow dir={step} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5" aria-hidden="true">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-center font-body text-xs text-lilac/70">
              {w}
            </span>
          ))}
        </div>
        <motion.div
          key={month}
          role="radiogroup"
          aria-label={`Day in ${monthTitle(month)}`}
          className="mt-2 grid grid-cols-7 gap-1.5"
          initial={{ opacity: 0, x: monthDir * 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          {monthCells(month).map((d, i) => {
            if (!d) return <span key={`pad-${i}`} aria-hidden="true" />;
            const daySlots = slotsByDay.get(d);
            const open = Boolean(daySlots?.length);
            const selected = d === day;
            const dayNumber = Number(d.slice(8));
            return (
              <motion.button
                key={d}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!open}
                aria-label={
                  open && daySlots
                    ? `${formatDay(daySlots[0], "Africa/Lagos")}, ${daySlots.length} ${daySlots.length === 1 ? "time" : "times"}`
                    : undefined
                }
                onClick={() => setPickedDay(d)}
                whileTap={open ? { scale: 0.92 } : undefined}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + Math.floor(i / 7) * 0.04, duration: 0.4, ease: EASE }}
                className={[
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg font-body text-sm tabular-nums lining-nums transition-colors sm:text-base",
                  selected
                    ? "bg-cream text-night"
                    : open
                      ? "border border-night-line text-cream hover:border-gold/60"
                      : "cursor-default text-lilac/30"
                ].join(" ")}
              >
                {dayNumber}
                {open ? (
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-1.5 h-1 w-1 rounded-full ${selected ? "bg-night/60" : "bg-gold"}`}
                  />
                ) : null}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {day && slots[0] ? (
        <p className="mt-8 font-body text-sm text-lilac">{formatDay(slots[0], "Africa/Lagos")}</p>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={day}
          role="radiogroup"
          aria-label="Time"
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
          initial="hidden"
          animate="show"
          exit="hidden"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
        >
          {slots.map((s) => {
            const selected = value === s;
            return (
              <motion.button
                key={s}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={isLagos ? formatTime(s, tz) : `${formatTime(s, tz)}, ${formatTime(s, "Africa/Lagos")} in Lagos`}
                onClick={() => onChange(s)}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } }
                }}
                className="relative flex min-h-[3.75rem] flex-col items-center justify-center rounded-xl py-2 font-body"
              >
                {selected ? (
                  <motion.span
                    layoutId="time-pill"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl bg-gold"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl border border-night-line transition-colors hover:border-gold/60"
                  />
                )}
                <span className={`relative text-lg tabular-nums lining-nums ${selected ? "text-night" : "text-cream"}`}>
                  {formatTime(s, tz)}
                </span>
                {!isLagos ? (
                  <span className={`relative text-xs tabular-nums lining-nums ${selected ? "text-night/70" : "text-lilac"}`}>
                    {formatTime(s, "Africa/Lagos")} Lagos
                    {localDate(s, tz) !== day ? ", your next day" : ""}
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
