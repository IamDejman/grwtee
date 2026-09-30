"use client";

import { AnimatePresence, MotionConfig, PresenceContext, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { emptyBrief, firstName, type DecemberBrief } from "@/lib/december/types";
import { AmbientLight, WordPanel } from "./Ambient";
import { BriefStep, type EditTarget } from "./BriefStep";
import { Invitation } from "./Invitation";
import { EASE, PrimaryButton, RevealText } from "./primitives";
import { ContactStep, LooksStep, NameStep, OccasionsStep, StyleStep } from "./steps";
import { TimelineStep } from "./TimelineStep";
import { viewerTimeZone } from "./SlotPicker";
import { TimeStep, type BookOutcome } from "./TimeStep";

const STEPS = ["intro", "name", "contact", "occasions", "looks", "timeline", "style", "brief", "time", "done"] as const;
type Step = (typeof STEPS)[number];
const THREAD_STEPS = STEPS.length - 2; // name through time

const WORDS: Record<Step, string> = {
  intro: "December",
  name: "Hello",
  contact: "Stay close",
  occasions: "Occasions",
  looks: "Looks",
  timeline: "Your dates",
  style: "Style",
  brief: "The brief",
  time: "Time",
  done: "Booked"
};

// Browser tab title per step; the intro keeps the page's metadata title.
const TITLES: Record<Step, string> = {
  intro: "Lagos in December",
  name: "Your name",
  contact: "Your contact details",
  occasions: "Your occasions",
  looks: "Your looks",
  timeline: "Your December dates",
  style: "Your style",
  brief: "Your brief",
  time: "Choose a time",
  done: "You're booked"
};

const STORAGE_KEY = "grwtee-december-brief-v1";

interface Saved {
  brief: DecemberBrief;
  step: Step;
  clientRef?: string;
}

// Steps after contact details: from here the brief is saved server-side as a draft.
const DRAFT_STEPS: readonly Step[] = ["occasions", "looks", "timeline", "style", "brief", "time"];

function saveDraft(clientRef: string, step: Step, brief: DecemberBrief) {
  const { consent: _consent, slotStart: _slot, ...fields } = brief;
  void fetch("/api/december/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientRef, step, brief: fields }),
    keepalive: true
  }).catch(() => {
    // Best effort: a missed draft only affects the admin follow-up list.
  });
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => {};

function parseSaved(raw: string | null): Saved | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as Saved;
    return STEPS.includes(saved.step) && saved.step !== "done" && saved.brief?.name?.trim() ? saved : null;
  } catch {
    return null;
  }
}

function writeSaved(saved: Saved | null) {
  try {
    if (saved) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the flow still works, it just won't resume.
  }
}

/** Progress as a gold thread with a stitch per question. */
function GoldThread({ index }: { index: number }) {
  const done = index >= THREAD_STEPS;
  const progress = done ? 1 : (index + 0.5) / THREAD_STEPS;
  return (
    <div className="relative h-3 w-full" aria-hidden="true">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-night-line" />
      <motion.span
        className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-gold"
        style={{ originX: 0 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: progress }}
        transition={{ duration: 1.1, ease: EASE }}
      />
      {Array.from({ length: THREAD_STEPS }, (_, i) => {
        const complete = i < index || done;
        const current = i === index && !done;
        return (
          <motion.span
            key={i}
            className="absolute top-1/2 h-2.5 w-[1.5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${((i + 0.5) / THREAD_STEPS) * 100}%` }}
            initial={false}
            animate={{
              backgroundColor: complete || current ? "#CF9D4E" : "#3A2D4D",
              scaleY: current ? 1.6 : 1
            }}
            transition={{ duration: 0.5, delay: current ? 0.6 : 0, ease: EASE }}
          />
        );
      })}
    </div>
  );
}

function Intro({
  full,
  closed,
  resumeName,
  onStart,
  onResume,
  headingRef
}: {
  full: boolean;
  closed: boolean;
  resumeName: string | null;
  onStart: () => void;
  onResume: () => void;
  headingRef: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="flex max-w-xl flex-col">
      <motion.p
        className="font-body text-sm text-gold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        GRWTEE x Lagos in December 2026
      </motion.p>
      <RevealText
        text="Lagos in December, styled with intention."
        headingRef={headingRef}
        delay={0.2}
        className="mt-5 font-cormorant text-[3.25rem] font-light leading-[0.98] text-cream md:text-[5rem]"
      />
      <motion.p
        className="mt-8 max-w-md font-body text-base leading-relaxed text-cream/80 md:text-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7, ease: EASE }}
      >
        Concerts, brunches, dinners and nights that run late. Tell us what&apos;s on your calendar and
        we&apos;ll curate a look for each occasion.
        {full || closed ? null : " It takes about three minutes, then you choose a time for your consultation."}
      </motion.p>
      <motion.div
        className="mt-10 flex flex-wrap items-center gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.7, ease: EASE }}
      >
        {closed ? (
          <p className="font-body text-base text-gold">
            Bookings for December have closed. Thank you, and we&apos;ll see you next season.
          </p>
        ) : full ? (
          <p className="font-body text-base text-gold">
            December is fully booked. Thank you, and we&apos;ll see you next season.
          </p>
        ) : resumeName !== null ? (
          <>
            <PrimaryButton type="button" onClick={onResume}>
              {resumeName ? `Continue your brief, ${resumeName}` : "Continue your brief"}
            </PrimaryButton>
            <button
              type="button"
              onClick={onStart}
              className="font-body text-sm text-lilac underline-offset-4 hover:text-cream hover:underline"
            >
              Start over
            </button>
          </>
        ) : (
          <PrimaryButton type="button" onClick={onStart}>
            Start your brief
          </PrimaryButton>
        )}
      </motion.div>
    </div>
  );
}

export function DecemberFlow({
  initialCountry,
  fee,
  full,
  closed
}: {
  initialCountry: string;
  fee: string;
  full: boolean;
  closed: boolean;
}) {
  const reduce = useReducedMotion();
  const [brief, setBrief] = useState<DecemberBrief>(() => emptyBrief(initialCountry));
  const [step, setStep] = useState<Step>("intro");
  const [dir, setDir] = useState(1);
  const [returnToBrief, setReturnToBrief] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const userNavigated = useRef(false);
  // One id per brief: links the draft to the booking, and stops a retried request booking twice.
  const clientRef = useRef<string | null>(null);
  const [booked, setBooked] = useState<{ meetUrl: string | null; manageUrl: string | null }>({
    meetUrl: null,
    manageUrl: null
  });

  // Draft from a previous visit; read once on the client, null during SSR.
  const savedRaw = useSyncExternalStore(noopSubscribe, readRaw, () => null);
  const saved = useMemo(() => parseSaved(savedRaw), [savedRaw]);

  useEffect(() => {
    document.title = step === "intro" ? "Lagos in December | GRWTEE" : `${TITLES[step]} | Lagos in December | GRWTEE`;
  }, [step]);

  // Save a server draft on each step change (not on every keystroke).
  const draftedStep = useRef<Step | null>(null);
  useEffect(() => {
    if (!DRAFT_STEPS.includes(step) || draftedStep.current === step) return;
    draftedStep.current = step;
    clientRef.current ??= crypto.randomUUID();
    saveDraft(clientRef.current, step, brief);
  }, [brief, step]);

  useEffect(() => {
    if (step !== "intro" && step !== "done") writeSaved({ brief, step, clientRef: clientRef.current ?? undefined });
  }, [brief, step]);

  const update = useCallback((patch: Partial<DecemberBrief>) => setBrief((b) => ({ ...b, ...patch })), []);

  const index = STEPS.indexOf(step);
  const go = (target: Step) => {
    setDir(STEPS.indexOf(target) >= index ? 1 : -1);
    setStep(target);
    userNavigated.current = true;
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const next = () => {
    if (returnToBrief) {
      setReturnToBrief(false);
      go("brief");
    } else go(STEPS[index + 1]);
  };
  const back = () => go(STEPS[Math.max(index - 1, 1)]);
  const edit = (t: EditTarget) => {
    setReturnToBrief(true);
    go(t);
  };

  const book = async (turnstileToken: string): Promise<BookOutcome> => {
    clientRef.current ??= crypto.randomUUID();
    try {
      const res = await fetch("/api/december/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...brief, clientRef: clientRef.current, timezone: viewerTimeZone(), turnstileToken })
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        code?: string;
        meetUrl?: string | null;
        manageUrl?: string | null;
      };
      if (!res.ok || !json.success) {
        return { ok: false, code: json.code, message: json.error ?? "We couldn't book that time. Try again." };
      }
      setBooked({ meetUrl: json.meetUrl ?? null, manageUrl: json.manageUrl ?? null });
      writeSaved(null);
      go("done");
      return { ok: true };
    } catch {
      return { ok: false, message: "We couldn't reach GRWTEE. Check your connection and try again." };
    }
  };

  const focusStep = () => {
    if (!userNavigated.current) return;
    const auto = document.querySelector<HTMLElement>("[data-autofocus]");
    if (auto && window.matchMedia("(pointer: fine)").matches) auto.focus();
    else headingRef.current?.focus();
  };

  const stepProps = { brief, update, next, headingRef };
  const body: Record<Step, React.ReactNode> = {
    intro: (
      <Intro
        full={full}
        closed={closed}
        resumeName={saved ? firstName(saved.brief.name) : null}
        headingRef={headingRef}
        onStart={() => {
          clientRef.current = null;
          setBrief(emptyBrief(initialCountry));
          go("name");
        }}
        onResume={() => {
          if (!saved) return;
          clientRef.current = saved.clientRef ?? null;
          setBrief(saved.brief);
          go(saved.step);
        }}
      />
    ),
    name: <NameStep {...stepProps} />,
    contact: <ContactStep {...stepProps} />,
    occasions: <OccasionsStep {...stepProps} />,
    looks: <LooksStep {...stepProps} />,
    timeline: <TimelineStep {...stepProps} />,
    style: <StyleStep {...stepProps} />,
    brief: <BriefStep {...stepProps} onEdit={edit} fee={fee} />,
    time: <TimeStep brief={brief} update={update} headingRef={headingRef} onBook={book} />,
    done: (
      <Invitation brief={brief} headingRef={headingRef} meetUrl={booked.meetUrl} manageUrl={booked.manageUrl} fee={fee} />
    )
  };

  const blur = reduce ? "blur(0px)" : "blur(8px)";
  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 48, filter: blur }),
    center: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (d: number) => ({
      opacity: 0,
      x: reduce ? 0 : d * -32,
      filter: blur,
      transition: { duration: 0.3, ease: EASE }
    })
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-svh bg-night text-cream lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,40%)]">
        <div className="relative flex min-h-svh flex-col">
          {/* Mobile intro light */}
          <AnimatePresence>
            {step === "intro" ? (
              <motion.div
                className="absolute inset-0 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
              >
                <AmbientLight />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className={`sticky top-0 z-20 ${step === "intro" ? "" : "bg-night/85 backdrop-blur-md"}`}>
            <div className="flex h-16 items-center justify-between px-5 md:px-12 lg:px-20">
              <div className="flex items-center gap-6">
                <Link href="/" aria-label="GRWTEE home">
                  <Image src="/logo.svg" alt="GRWTEE" width={110} height={20} className="brightness-0 invert" style={{ width: 110, height: "auto" }} priority />
                </Link>
                <AnimatePresence>
                  {index > 1 && step !== "done" ? (
                    <motion.button
                      type="button"
                      onClick={back}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      className="font-body text-sm text-lilac hover:text-cream"
                    >
                      Back
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>
              {step !== "intro" && step !== "done" ? (
                <Link href="/" className="font-body text-sm text-lilac hover:text-cream">
                  Save and exit
                </Link>
              ) : null}
            </div>
            <AnimatePresence>
              {step !== "intro" ? (
                <motion.div
                  className="px-5 md:px-12 lg:px-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <GoldThread index={index - 1} />
                  <p className="sr-only" aria-live="polite">
                    {step === "done" ? "Booking complete" : `Step ${index} of ${THREAD_STEPS}`}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div
            className={`relative flex flex-1 px-5 py-12 md:px-12 lg:px-20 ${
              step === "intro" ? "items-end pb-16 md:items-center" : step === "done" ? "items-start justify-center" : "items-start md:items-center"
            }`}
          >
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.55, ease: EASE }}
                onAnimationComplete={(def) => def === "center" && focusStep()}
                className={`flex w-full ${step === "done" ? "justify-center" : ""}`}
              >
                {/* Only this wrapper animates out. Without the null context, a shared-layout pill inside
                    a step can hold the exit open forever and the next screen never mounts. */}
                <PresenceContext.Provider value={null}>{body[step]}</PresenceContext.Provider>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop word panel */}
        <aside className="sticky top-0 hidden h-svh overflow-hidden lg:block" aria-hidden="true">
          <WordPanel word={WORDS[step]} index={index} total={THREAD_STEPS} />
        </aside>
      </div>
    </MotionConfig>
  );
}
