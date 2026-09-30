"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { EASE, Label, textareaClass } from "./primitives";
import { StepFrame, type StepProps } from "./steps";

const YEAR = 2026;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const lead = (new Date(Date.UTC(YEAR, 11, 1)).getUTCDay() + 6) % 7;

/** Weeks are grid rows; the editor opens under the row of the tapped date. */
const rowOf = (day: number) => Math.floor((lead + day - 1) / 7);
const endsRow = (day: number) => (lead + day) % 7 === 0 || day === 31;

function dayLabel(day: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(YEAR, 11, day)));
}

function DayEditor({
  day,
  draft,
  setDraft,
  quickPicks,
  hasEvent,
  onSave,
  onRemove
}: {
  day: number;
  draft: string;
  setDraft: (v: string) => void;
  quickPicks: string[];
  hasEvent: boolean;
  onSave: () => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      onAnimationComplete={(def) => {
        // Keep the whole editor on screen once it has opened (short phones, bottom rows).
        if (typeof def === "object" && def !== null && "height" in def && def.height === "auto") {
          ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }}
      className="col-span-7 overflow-hidden"
    >
      <div className="my-2 rounded-xl border border-gold/40 bg-night-raised/80 p-5">
        <label htmlFor="event-title" className="block font-cormorant text-2xl text-cream">
          What&apos;s on, {dayLabel(day)}?
        </label>
        <input
          id="event-title"
          autoFocus
          autoComplete="off"
          enterKeyHint="done"
          className="mt-3 w-full border-0 border-b border-night-line bg-transparent px-0 pb-2 font-body text-lg text-cream placeholder:text-lilac/50 focus:border-gold focus:outline-none focus:ring-0"
          placeholder="A concert, a brunch, a party…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave();
            }
          }}
        />
        {quickPicks.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {quickPicks.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setDraft(o)}
                className="rounded-full border border-night-line px-3 py-1 font-body text-xs text-lilac hover:border-gold/60 hover:text-cream"
              >
                {o}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-4 flex gap-4">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-cream px-5 py-2 font-accent text-sm font-semibold text-night hover:bg-white"
          >
            Save date
          </button>
          {hasEvent ? (
            <button
              type="button"
              onClick={onRemove}
              className="font-body text-sm text-lilac underline-offset-4 hover:text-cream hover:underline"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export function TimelineStep({ brief, update, next, headingRef }: StepProps) {
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const eventOn = (day: number) => brief.events.find((e) => e.day === day);

  const open = (day: number) => {
    setOpenDay(openDay === day ? null : day);
    setDraft(eventOn(day)?.title ?? "");
  };
  const save = () => {
    if (openDay === null) return;
    const rest = brief.events.filter((e) => e.day !== openDay);
    const title = draft.trim();
    update({
      events: (title ? [...rest, { day: openDay, title }] : rest).sort((a, b) => a.day - b.day)
    });
    setOpenDay(null);
  };
  const quickPicks = brief.occasions
    .map((o) => (o === "Other" ? brief.otherOccasion.trim() : o))
    .filter(Boolean);

  return (
    <StepFrame
      title="Walk us through your December."
      helper="Tap a date and tell us what's on. Skip anything you haven't planned yet."
      headingRef={headingRef}
      onValid={next}
    >
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="December dates">
        {WEEKDAYS.map((d) => (
          <span key={d} aria-hidden="true" className="pb-1 text-center font-body text-xs text-lilac/70">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`pad-${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: 31 }, (_, i) => {
          const day = i + 1;
          const ev = eventOn(day);
          const active = openDay === day;
          const editorHere = endsRow(day) && openDay !== null && rowOf(openDay) === rowOf(day);
          return [
            <motion.button
              key={day}
              type="button"
              onClick={() => open(day)}
              aria-label={`${dayLabel(day)}${ev ? `, ${ev.title}` : ""}`}
              aria-expanded={active}
              whileTap={{ scale: 0.94 }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.012, duration: 0.4, ease: EASE }}
              className={[
                "relative flex aspect-square flex-col items-center justify-center rounded-lg border font-body text-sm tabular-nums lining-nums transition-colors sm:text-base",
                active
                  ? "border-gold text-cream"
                  : ev
                    ? "border-gold/50 bg-gold/10 text-cream"
                    : "border-night-line/70 text-lilac hover:border-lilac/50 hover:text-cream"
              ].join(" ")}
            >
              {day}
              <AnimatePresence>
                {ev ? (
                  <motion.span
                    aria-hidden="true"
                    className="absolute bottom-1.5 h-1 w-1 rounded-full bg-gold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  />
                ) : null}
              </AnimatePresence>
            </motion.button>,
            endsRow(day) ? (
              <AnimatePresence key={`editor-${rowOf(day)}`} initial={false}>
                {editorHere && openDay !== null ? (
                  <DayEditor
                    key={openDay}
                    day={openDay}
                    draft={draft}
                    setDraft={setDraft}
                    quickPicks={quickPicks}
                    hasEvent={Boolean(eventOn(openDay))}
                    onSave={save}
                    onRemove={() => {
                      update({ events: brief.events.filter((e) => e.day !== openDay) });
                      setOpenDay(null);
                    }}
                  />
                ) : null}
              </AnimatePresence>
            ) : null
          ];
        })}
      </div>

      {brief.events.length ? (
        <ul className="mt-8 space-y-2" aria-label="Your December dates">
          <AnimatePresence initial={false}>
            {brief.events.map((e) => (
              <motion.li
                key={e.day}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="flex items-baseline gap-4 border-b border-night-line/60 pb-2"
              >
                <span className="w-20 shrink-0 whitespace-nowrap font-cormorant text-2xl text-gold tabular-nums lining-nums">
                  {e.day} Dec
                </span>
                <span className="font-body text-base text-cream">{e.title}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : null}

      <div className="mt-10">
        <Label htmlFor="plans">Anything else about your plans?</Label>
        <textarea
          id="plans"
          rows={3}
          className={`${textareaClass} mt-2`}
          placeholder="Travelling in from London on the 18th, dress codes, who you're going with…"
          value={brief.plans}
          onChange={(e) => update({ plans: e.target.value })}
        />
      </div>
    </StepFrame>
  );
}
