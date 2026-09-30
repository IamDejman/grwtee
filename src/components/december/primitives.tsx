"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Headline that rises word by word from behind a mask. */
export function RevealText({
  text,
  as: Tag = "h1",
  className = "",
  delay = 0,
  headingRef
}: {
  text: string;
  as?: "h1" | "h2" | "p";
  className?: string;
  delay?: number;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <Tag
      ref={headingRef}
      tabIndex={headingRef ? -1 : undefined}
      aria-label={text}
      className={`text-balance outline-none ${className}`}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true" className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={reduce ? { opacity: 0 } : { y: "105%" }}
            animate={reduce ? { opacity: 1 } : { y: "0%" }}
            transition={{ duration: 0.8, ease: EASE, delay: delay + i * 0.045 }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

export function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          role="alert"
          className="text-sm text-coral"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          <span className="block pt-2">{message}</span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

export const inputClass =
  "w-full border-0 border-b border-night-line bg-transparent px-0 pb-3 pt-2 font-body text-xl text-cream placeholder:text-lilac/50 transition-colors focus:border-gold focus:outline-none focus:ring-0 focus-visible:outline-none md:text-2xl";

export const textareaClass =
  "w-full resize-none rounded-lg border border-night-line bg-night-raised/60 px-4 py-3 font-body text-base leading-relaxed text-cream placeholder:text-lilac/50 transition-colors focus:border-gold focus:outline-none focus:ring-0 focus-visible:outline-none";

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block font-body text-sm text-lilac">
      {children}
    </label>
  );
}

/** Toggle chip with a stitched gold edge that tacks on when selected. */
export function Chip({
  selected,
  onToggle,
  children,
  className = ""
}: {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      className={[
        "relative rounded-full border px-5 py-2.5 font-body text-base transition-colors",
        selected
          ? "border-gold bg-gold/10 text-cream"
          : "border-night-line text-lilac hover:border-lilac/60 hover:text-cream",
        className
      ].join(" ")}
    >
      <AnimatePresence initial={false}>
        {selected ? (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[3px] rounded-full border border-dashed border-gold/60"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.35, ease: EASE }}
          />
        ) : null}
      </AnimatePresence>
      <span className="relative">{children}</span>
    </motion.button>
  );
}

export function PrimaryButton({
  children,
  loading,
  disabled,
  type = "submit",
  onClick
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.97 }}
      className="relative inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-gold px-9 font-accent text-base font-semibold text-night transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-night/30 border-t-night"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </motion.button>
  );
}
