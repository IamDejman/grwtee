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

function Skeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <motion.span
            key={i}
            className="h-[5.5rem] w-[4.5rem] shrink-0 rounded-xl bg-night-raised"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.08 }}
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
  // The day the client tapped, else the day of the selected time, else the first open day.
  const day = (days.some(([d]) => d === pickedDay) ? pickedDay : undefined) ?? valueDay ?? days[0]?.[0];
  const slots = days.find(([d]) => d === day)?.[1] ?? [];
  const isLagos = matchesLagos(slots, tz);

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
      <div
        role="radiogroup"
        aria-label="Day"
        className="-mx-5 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:px-0"
      >
        {days.map(([d, daySlots], i) => {
          const selected = d === day;
          const first = daySlots[0];
          return (
            <motion.button
              key={d}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={formatDay(first, tz)}
              onClick={() => setPickedDay(d)}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + Math.min(i, 8) * 0.04, duration: 0.5, ease: EASE }}
              className="relative flex w-[4.5rem] shrink-0 snap-start flex-col items-center rounded-xl py-3 font-body"
            >
              {selected ? (
                <motion.span
                  layoutId="day-pill"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl bg-cream"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : (
                <span aria-hidden="true" className="absolute inset-0 rounded-xl border border-night-line" />
              )}
              <span className={`relative text-xs ${selected ? "text-night/70" : "text-lilac"}`}>
                {new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz }).format(new Date(first))}
              </span>
              <span
                className={`relative font-cormorant text-3xl leading-tight tabular-nums lining-nums ${selected ? "text-night" : "text-cream"}`}
              >
                {new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: tz }).format(new Date(first))}
              </span>
              <span className={`relative text-xs ${selected ? "text-night/70" : "text-lilac"}`}>
                {new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: tz }).format(new Date(first))}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={day}
          role="radiogroup"
          aria-label="Time"
          className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
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
