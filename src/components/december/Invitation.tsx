"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import { consultationIcs } from "@/lib/december/ics";
import { firstName, type DecemberBrief } from "@/lib/december/types";
import { EASE, RevealText } from "./primitives";
import { formatDay, formatTime, viewerTimeZone } from "./SlotPicker";

export interface Booked {
  meetUrl: string | null;
  manageUrl: string | null;
  /** Set while the time is only held pending payment; the invite follows once it's confirmed. */
  holdExpiresAt: string | null;
}

/** Confirmation: a hang tag that drops in on the gold thread and settles. */
export function Invitation({
  brief,
  headingRef,
  booked: { meetUrl, manageUrl, holdExpiresAt },
  fee
}: {
  brief: DecemberBrief;
  fee: string;
  headingRef: React.Ref<HTMLHeadingElement>;
  booked: Booked;
}) {
  const reduce = useReducedMotion();
  const tz = useMemo(() => viewerTimeZone(), []);
  const slot = brief.slotStart ?? new Date().toISOString();
  const local = formatTime(slot, tz);
  const lagos = formatTime(slot, "Africa/Lagos");
  const held = holdExpiresAt !== null;

  const downloadIcs = () => {
    const url = URL.createObjectURL(new Blob([consultationIcs(slot)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "grwtee-december-consultation.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center pt-24 md:pt-28">
      <div className="relative w-full">
        <motion.div
          style={{ originY: 0, transformPerspective: 1000 }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -60, rotate: -9 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 0 }}
          transition={
            reduce
              ? { duration: 0.4 }
              : {
                  opacity: { delay: 0.6, duration: 0.3 },
                  y: { delay: 0.6, type: "spring", stiffness: 140, damping: 14 },
                  rotate: { delay: 0.6, type: "spring", stiffness: 90, damping: 6 }
                }
          }
          className="relative rounded-2xl bg-cream px-7 pb-8 pt-16 text-night shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]"
        >
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-6 h-5 w-5 -translate-x-1/2 rounded-full bg-night ring-2 ring-gold"
          />
          <p className="font-body text-sm text-night/60">GRWTEE x Lagos in December</p>
          <RevealText
            text={held ? `Your time is held, ${firstName(brief.name)}.` : `You're booked, ${firstName(brief.name)}.`}
            headingRef={headingRef}
            delay={1}
            className="mt-2 font-cormorant text-[2.6rem] font-light leading-[1.05] text-night"
          />
          <div className="mt-8 border-t border-dashed border-night/20 pt-6">
            <p className="font-cormorant text-3xl leading-tight text-purple-dark lining-nums">{formatDay(slot, tz)}</p>
            <p className="mt-1 font-body text-lg tabular-nums lining-nums text-night">
              {local}
              {local !== lagos ? <span className="text-night/60"> your time, {lagos} in Lagos</span> : null}
            </p>
            {meetUrl ? (
              <a
                href={meetUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block font-body text-sm text-purple-dark underline underline-offset-4 hover:text-purple-medium"
              >
                30 minutes on Google Meet
              </a>
            ) : (
              <p className="mt-1 font-body text-sm text-night/60">30 minutes on Google Meet</p>
            )}
          </div>
          {holdExpiresAt ? (
            <div className="mt-6 space-y-3 font-body text-sm leading-relaxed text-night/80">
              <p>
                We&apos;re holding this time until{" "}
                <span className="font-semibold text-night">
                  {formatTime(holdExpiresAt, tz)} on {formatDay(holdExpiresAt, tz)}
                </span>
                . Payment details for the {fee ? `${fee} ` : ""}consultation fee are on their way to{" "}
                <span className="text-night [overflow-wrap:anywhere]">{brief.email}</span>.
              </p>
              <p>
                Once we confirm your payment, we&apos;ll send your calendar invite with the Google Meet link. If
                payment isn&apos;t confirmed by then, the time is released.
              </p>
            </div>
          ) : (
            <p className="mt-6 font-body text-sm leading-relaxed text-night/80">
              Your calendar invite with the Meet link is on its way to{" "}
              <span className="text-night [overflow-wrap:anywhere]">{brief.email}</span>.
              {fee ? " Your confirmation email has the payment details for the consultation fee." : null}
            </p>
          )}
        </motion.div>

        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[calc(100%-2.35rem)] left-1/2 z-10 h-[45vh] w-[1.25px] -translate-x-1/2 bg-gold"
          style={{ originY: 0 }}
          initial={{ scaleY: reduce ? 1 : 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </div>

      <motion.div
        className="mt-10 flex flex-wrap items-center justify-center gap-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.5, ease: EASE }}
      >
        {held ? null : (
          <button
            type="button"
            onClick={downloadIcs}
            className="inline-flex min-h-[48px] items-center rounded-full bg-gold px-7 font-accent text-sm font-semibold text-night hover:bg-gold-light"
          >
            Add to calendar
          </button>
        )}
        {manageUrl ? (
          <a href={manageUrl} className="font-body text-sm text-lilac underline-offset-4 hover:text-cream hover:underline">
            {held ? "Change time or cancel" : "Reschedule or cancel"}
          </a>
        ) : null}
        <Link href="/" className="font-body text-sm text-lilac underline-offset-4 hover:text-cream hover:underline">
          Back to GRWTEE
        </Link>
      </motion.div>
    </div>
  );
}
