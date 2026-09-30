"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { EASE, Label, textareaClass } from "./primitives";
import { StepFrame, type StepProps } from "./steps";

const YEAR = 2026;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const lead = (new Date(Date.UTC(YEAR, 11, 1)).getUTCDay() + 6) % 7;

function dayLabel(day: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(YEAR, 11, day)));
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
      helper="Tap a date to add what's happening. Skip anything you haven't planned yet."
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
          return (
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
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {openDay !== null ? (
          <motion.div
            key={openDay}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-6 rounded-xl border border-night-line bg-night-raised/70 p-5">
              <p className="font-cormorant text-2xl text-cream">{dayLabel(openDay)}</p>
              <label htmlFor="event-title" className="sr-only">
                What&apos;s happening on {dayLabel(openDay)}
              </label>
              <input
                id="event-title"
                autoFocus
                className="mt-3 w-full border-0 border-b border-night-line bg-transparent px-0 pb-2 font-body text-lg text-cream placeholder:text-lilac/50 focus:border-gold focus:outline-none focus:ring-0"
                placeholder="What's happening?"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
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
                  onClick={save}
                  className="rounded-full bg-cream px-5 py-2 font-accent text-sm font-semibold text-night hover:bg-white"
                >
                  Save date
                </button>
                {eventOn(openDay) ? (
                  <button
                    type="button"
                    onClick={() => {
                      update({ events: brief.events.filter((e) => e.day !== openDay) });
                      setOpenDay(null);
                    }}
                    className="font-body text-sm text-lilac underline-offset-4 hover:text-cream hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
