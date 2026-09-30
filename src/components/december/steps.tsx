"use client";

import { AnimatePresence, motion } from "framer-motion";
import { isValidPhoneNumber, type CountryCode } from "libphonenumber-js";
import { useState, type ReactNode } from "react";
import {
  OCCASIONS,
  STYLE_WORDS,
  firstName,
  type DecemberBrief,
  type LookCount
} from "@/lib/december/types";
import { PhoneField } from "./PhoneField";
import {
  Chip,
  EASE,
  FieldError,
  Label,
  PrimaryButton,
  RevealText,
  inputClass,
  textareaClass
} from "./primitives";

export interface StepProps {
  brief: DecemberBrief;
  update: (patch: Partial<DecemberBrief>) => void;
  next: () => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}

type Errors = Record<string, string | undefined>;

/** Shared step layout: question, helper, body, continue. Enter submits. */
export function StepFrame({
  title,
  helper,
  children,
  headingRef,
  validate,
  onValid,
  cta = "Continue",
  loading
}: {
  title: string;
  helper?: ReactNode;
  children: ReactNode;
  headingRef: React.Ref<HTMLHeadingElement>;
  validate?: () => Errors;
  onValid: () => void;
  cta?: string;
  loading?: boolean;
}) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const errors = validate?.() ?? {};
        if (Object.values(errors).every((v) => !v)) onValid();
        else requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      }}
      className="flex w-full max-w-xl flex-col"
    >
      <RevealText
        text={title}
        headingRef={headingRef}
        className="font-cormorant text-[2.5rem] font-light leading-[1.05] text-cream md:text-[3.5rem]"
      />
      {helper ? (
        <motion.p
          className="mt-4 max-w-md font-body text-base leading-relaxed text-lilac"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          {helper}
        </motion.p>
      ) : null}
      <motion.div
        className="mt-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
      >
        {children}
      </motion.div>
      <motion.div
        className="mt-12 flex items-center gap-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <PrimaryButton loading={loading}>{cta}</PrimaryButton>
        <span className="hidden font-body text-sm text-lilac/70 [@media(pointer:fine)]:inline">
          or press Enter
        </span>
      </motion.div>
    </form>
  );
}

export function NameStep({ brief, update, next, headingRef }: StepProps) {
  const [error, setError] = useState<string>();
  return (
    <StepFrame
      title="First, what should we call you?"
      headingRef={headingRef}
      validate={() => {
        const e = brief.name.trim().length < 2 ? "Enter your full name." : undefined;
        setError(e);
        return { name: e };
      }}
      onValid={next}
    >
      <label htmlFor="name" className="sr-only">
        Full name
      </label>
      <input
        id="name"
        name="name"
        data-autofocus
        className={inputClass}
        autoComplete="name"
        placeholder="Full name"
        value={brief.name}
        aria-invalid={Boolean(error)}
        onChange={(e) => update({ name: e.target.value })}
      />
      <FieldError message={error} />
    </StepFrame>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ContactStep({ brief, update, next, headingRef }: StepProps) {
  const [errors, setErrors] = useState<Errors>({});
  const name = firstName(brief.name);
  return (
    <StepFrame
      title={name ? `Where can we reach you, ${name}?` : "Where can we reach you?"}
      helper="We send your confirmation by email and check in on WhatsApp. Your answers are saved as you go, so we can help if you stop partway."
      headingRef={headingRef}
      validate={() => {
        const phone = brief.whatsapp.trim();
        const next: Errors = {
          email: EMAIL_RE.test(brief.email.trim()) ? undefined : "Enter a valid email address.",
          whatsapp: !phone
            ? "Enter your WhatsApp number."
            : !brief.country && !phone.startsWith("+")
              ? "Choose your country code."
              : isValidPhoneNumber(phone, (brief.country || undefined) as CountryCode | undefined)
                ? undefined
                : "Check the number and country code."
        };
        setErrors(next);
        return next;
      }}
      onValid={next}
    >
      <div className="space-y-10">
        <div>
          <Label htmlFor="email">Email address</Label>
          <input
            id="email"
            name="email"
            data-autofocus
            type="email"
            spellCheck={false}
            inputMode="email"
            autoComplete="email"
            className={inputClass}
            placeholder="you@example.com"
            value={brief.email}
            aria-invalid={Boolean(errors.email)}
            onChange={(e) => update({ email: e.target.value })}
          />
          <FieldError message={errors.email} />
        </div>
        <div>
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <PhoneField
            country={brief.country}
            value={brief.whatsapp}
            invalid={Boolean(errors.whatsapp)}
            onCountryChange={(country) => update({ country })}
            onChange={(whatsapp) => update({ whatsapp })}
          />
          <FieldError message={errors.whatsapp} />
        </div>
      </div>
    </StepFrame>
  );
}

export function OccasionsStep({ brief, update, next, headingRef }: StepProps) {
  const otherOn = brief.occasions.includes("Other");
  const toggle = (o: string) =>
    update({
      occasions: brief.occasions.includes(o)
        ? brief.occasions.filter((x) => x !== o)
        : [...brief.occasions, o]
    });
  return (
    <StepFrame
      title="What are you dressing for this December?"
      helper="Choose all that apply."
      headingRef={headingRef}
      onValid={next}
    >
      <div className="flex flex-wrap gap-3">
        {[...OCCASIONS, "Other"].map((o) => (
          <Chip key={o} selected={brief.occasions.includes(o)} onToggle={() => toggle(o)}>
            {o}
          </Chip>
        ))}
      </div>
      <AnimatePresence initial={false}>
        {otherOn ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-8">
              <Label htmlFor="other">Tell us the occasion</Label>
              <input
                id="other"
                className={inputClass}
                placeholder="A wedding, a work party, a trip…"
                value={brief.otherOccasion}
                onChange={(e) => update({ otherOccasion: e.target.value })}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </StepFrame>
  );
}

const LOOK_OPTIONS: { value: LookCount; line: string }[] = [
  { value: 5, line: "For a handful of standout moments." },
  { value: 10, line: "For a full December calendar." }
];

export function LooksStep({ brief, update, next, headingRef }: StepProps) {
  const [error, setError] = useState<string>();
  return (
    <StepFrame
      title="How many looks should we style?"
      headingRef={headingRef}
      validate={() => {
        const e = brief.looks ? undefined : "Choose 5 or 10 looks.";
        setError(e);
        return { looks: e };
      }}
      onValid={next}
    >
      <div role="radiogroup" aria-label="Number of looks" className="grid grid-cols-2 gap-4">
        {LOOK_OPTIONS.map((o) => {
          const selected = brief.looks === o.value;
          return (
            <motion.button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${o.value} looks. ${o.line}`}
              onClick={() => {
                update({ looks: o.value });
                setError(undefined);
              }}
              whileTap={{ scale: 0.98 }}
              className="relative flex min-h-[13rem] flex-col justify-between rounded-2xl border border-night-line p-5 text-left transition-colors hover:border-lilac/50 md:p-7"
            >
              {selected ? (
                <motion.span
                  layoutId="looks-selected"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-2xl border border-gold bg-gold/[0.07]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span
                className={`relative font-cormorant text-7xl font-light leading-none lining-nums transition-colors md:text-8xl ${
                  selected ? "text-gold" : "text-cream"
                }`}
              >
                {o.value}
              </span>
              <span className="relative">
                <span className="block font-body text-base text-cream">looks</span>
                <span className="mt-1 block font-body text-sm leading-snug text-lilac">{o.line}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
      <FieldError message={error} />
    </StepFrame>
  );
}

function isUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function StyleStep({ brief, update, next, headingRef }: StepProps) {
  const [linkError, setLinkError] = useState<string>();
  const toggle = (w: string) =>
    update({
      styleWords: brief.styleWords.includes(w)
        ? brief.styleWords.filter((x) => x !== w)
        : [...brief.styleWords, w]
    });
  const setLink = (i: number, v: string) =>
    update({ styleLinks: brief.styleLinks.map((l, j) => (j === i ? v : l)) });

  return (
    <StepFrame
      title="How would you describe your style?"
      helper="Pick the words that feel like you, then add anything we should see."
      headingRef={headingRef}
      validate={() => {
        const links = brief.styleLinks.map((l) => {
          const t = l.trim();
          return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t;
        });
        update({ styleLinks: links });
        const bad = links.some((l) => l && !isUrl(l));
        const e = bad ? "Check the link. It should look like pinterest.com/your-board" : undefined;
        setLinkError(e);
        return { links: e };
      }}
      onValid={next}
    >
      <div className="flex flex-wrap gap-3">
        {STYLE_WORDS.map((w) => (
          <Chip key={w} selected={brief.styleWords.includes(w)} onToggle={() => toggle(w)}>
            {w}
          </Chip>
        ))}
      </div>

      <div className="mt-10">
        <Label htmlFor="style-notes">In your own words</Label>
        <textarea
          id="style-notes"
          rows={3}
          className={`${textareaClass} mt-2`}
          placeholder="Tailored pieces, gold jewellery, never too loud…"
          value={brief.styleNotes}
          onChange={(e) => update({ styleNotes: e.target.value })}
        />
      </div>

      <div className="mt-8 space-y-3">
        <p className="font-body text-sm text-lilac">Pinterest board, Instagram folder or references</p>
        <AnimatePresence initial={false}>
          {brief.styleLinks.map((link, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <label htmlFor={`link-${i}`} className="sr-only">
                Reference link {i + 1}
              </label>
              <input
                id={`link-${i}`}
                type="url"
                inputMode="url"
                className={`${inputClass} !text-base md:!text-lg`}
                placeholder="pinterest.com/your-board…"
                value={link}
                onChange={(e) => setLink(i, e.target.value)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {brief.styleLinks.length < 3 ? (
          <button
            type="button"
            onClick={() => update({ styleLinks: [...brief.styleLinks, ""] })}
            className="font-body text-sm text-gold underline-offset-4 hover:underline"
          >
            Add another link
          </button>
        ) : null}
        <FieldError message={linkError} />
      </div>
    </StepFrame>
  );
}
