"use client";

import { motion } from "framer-motion";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { useState, type ReactNode } from "react";
import { EASE, FieldError, Label, textareaClass } from "./primitives";
import { StepFrame, type StepProps } from "./steps";

export type EditTarget = "name" | "contact" | "occasions" | "looks" | "timeline" | "style";

function Row({
  label,
  target,
  onEdit,
  index,
  children
}: {
  label: string;
  target: EditTarget;
  onEdit: (t: EditTarget) => void;
  index: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 + index * 0.06, duration: 0.5, ease: EASE }}
      className="grid grid-cols-[6.5rem_1fr_auto] items-baseline gap-4 border-b border-night/10 py-4 last:border-0"
    >
      <dt className="font-body text-sm text-night/60">{label}</dt>
      <dd className="font-body text-base text-night">{children}</dd>
      <button
        type="button"
        onClick={() => onEdit(target)}
        className="font-body text-sm text-purple-dark underline-offset-4 hover:underline"
        aria-label={`Edit ${label.toLowerCase()}`}
      >
        Edit
      </button>
    </motion.div>
  );
}

const muted = <span className="text-night/50">-</span>;

export function BriefStep({
  brief,
  update,
  next,
  headingRef,
  onEdit,
  fee
}: StepProps & { onEdit: (t: EditTarget) => void; fee: string }) {
  const [error, setError] = useState<string>();
  const occasions = brief.occasions
    .map((o) => (o === "Other" && brief.otherOccasion.trim() ? brief.otherOccasion.trim() : o))
    .join(", ");
  const links = brief.styleLinks.filter((l) => l.trim());
  const style = [
    brief.styleWords.join(", "),
    brief.styleNotes.trim(),
    links.length ? `${links.length} reference link${links.length > 1 ? "s" : ""}` : ""
  ]
    .filter(Boolean)
    .join(". ");
  const phone =
    parsePhoneNumberFromString(brief.whatsapp, (brief.country || undefined) as CountryCode | undefined)?.formatInternational() ??
    brief.whatsapp;

  return (
    <StepFrame
      title="Your December brief"
      helper="Check the details, then choose a time for your consultation."
      headingRef={headingRef}
      cta="Choose a time"
      validate={() => {
        const e = brief.consent ? undefined : "Confirm you understand the fee terms to continue.";
        setError(e);
        return { consent: e };
      }}
      onValid={next}
    >
      <motion.dl
        initial={{ opacity: 0, rotateX: -8, y: 16 }}
        animate={{ opacity: 1, rotateX: 0, y: 0 }}
        transition={{ delay: 0.35, duration: 0.8, ease: EASE }}
        style={{ transformPerspective: 1200 }}
        className="rounded-2xl bg-cream px-5 py-2 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] md:px-7"
      >
        <Row label="Name" target="name" onEdit={onEdit} index={0}>
          {brief.name}
        </Row>
        <Row label="Contact" target="contact" onEdit={onEdit} index={1}>
          <span className="block [overflow-wrap:anywhere]">{brief.email}</span>
          <span className="block">{phone}</span>
        </Row>
        <Row label="Occasions" target="occasions" onEdit={onEdit} index={2}>
          {occasions || muted}
        </Row>
        <Row label="Looks" target="looks" onEdit={onEdit} index={3}>
          {brief.looks ? `${brief.looks} looks` : muted}
        </Row>
        <Row label="December" target="timeline" onEdit={onEdit} index={4}>
          {brief.events.length ? (
            <ul className="space-y-1">
              {brief.events.map((e) => (
                <li key={e.day}>
                  <span className="tabular-nums lining-nums text-purple-dark">{e.day} Dec</span> {e.title}
                </li>
              ))}
            </ul>
          ) : brief.plans.trim() ? (
            brief.plans.trim()
          ) : (
            muted
          )}
        </Row>
        <Row label="Style" target="style" onEdit={onEdit} index={5}>
          {style || muted}
        </Row>
      </motion.dl>

      <label className="relative mt-10 flex cursor-pointer items-start gap-4">
        <input
          type="checkbox"
          className="peer absolute left-0 top-0.5 h-7 w-7 cursor-pointer opacity-0"
          checked={brief.consent}
          onChange={(e) => {
            update({ consent: e.target.checked });
            if (e.target.checked) setError(undefined);
          }}
        />
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-lilac/60 transition-colors peer-checked:border-gold peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-night"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#CF9D4E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: brief.consent ? 1 : 0, opacity: brief.consent ? 1 : 0 }}
              transition={{ duration: 0.45, ease: EASE }}
            />
          </svg>
        </span>
        <span className="font-body text-base leading-relaxed text-cream">
          {fee
            ? `I understand that the consultation fee (${fee}) is non-refundable.`
            : "I understand that the consultation fee is non-refundable."}
        </span>
      </label>
      <FieldError message={error} />

      <div className="mt-8">
        <Label htmlFor="comments">Comments</Label>
        <textarea
          id="comments"
          rows={2}
          className={`${textareaClass} mt-2`}
          placeholder="Anything else you'd like us to know…"
          value={brief.comments}
          onChange={(e) => update({ comments: e.target.value })}
        />
      </div>
    </StepFrame>
  );
}
