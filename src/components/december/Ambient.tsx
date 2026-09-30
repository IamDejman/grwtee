"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE } from "./primitives";

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Two soft lights drifting slowly; transform-only so it stays cheap on phones. Frozen under reduced motion. */
export function AmbientLight({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const drift = (x: number[], y: number[], duration: number) =>
    reduce ? {} : { animate: { x, y }, transition: { duration, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const } };
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <motion.div
        className="absolute -right-[20%] -top-[15%] h-[70%] w-[90%] rounded-full bg-gold/30 blur-[120px]"
        {...drift([0, -60, 20], [0, 40, -20], 22)}
      />
      <motion.div
        className="absolute -bottom-[20%] -left-[20%] h-[70%] w-[90%] rounded-full bg-purple-medium/40 blur-[120px]"
        {...drift([0, 50, -30], [0, -40, 10], 26)}
      />
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

/** Desktop side panel: ambient light with one large serif word per step. */
export function WordPanel({ word, index, total }: { word: string; index: number; total: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 bg-night-raised">
      <AmbientLight />
      <div className="absolute inset-0 flex flex-col justify-between p-12">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-lilac/70">GRWTEE x Lagos</p>
        <div className="overflow-hidden pb-[0.15em] pr-[0.1em]" style={{ containerType: "inline-size" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={word}
              className="font-cormorant text-[clamp(2.5rem,21cqw,8.5rem)] font-light italic leading-none text-cream/90"
              initial={reduce ? { opacity: 0 } : { y: "105%" }}
              animate={reduce ? { opacity: 1 } : { y: "0%" }}
              exit={reduce ? { opacity: 0 } : { y: "-105%" }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              {word}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="font-cormorant text-2xl font-light text-gold [font-variant-numeric:lining-nums_tabular-nums]">
          {index > 0 && index <= total ? `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}` : "December 2026"}
        </p>
      </div>
    </div>
  );
}
