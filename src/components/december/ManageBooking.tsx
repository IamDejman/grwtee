"use client";

import { AnimatePresence, PresenceContext, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AmbientLight } from "./Ambient";
import { EASE, FieldError, PrimaryButton, RevealText } from "./primitives";
import { formatDay, formatTime, nearestSlot, SlotPicker, useSlots, viewerTimeZone } from "./SlotPicker";

export interface ManageInitial {
  name: string;
  status: string;
  slotStart: string;
  meetUrl: string | null;
  canChange: boolean;
}

type Mode = "view" | "reschedule" | "cancel";

async function post(
  token: string,
  body: object
): Promise<{ ok: boolean; code?: string; error?: string; slotStart?: string }> {
  try {
    const res = await fetch(`/api/december/manage/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      code?: string;
      error?: string;
      slotStart?: string;
    };
    return {
      ok: res.ok && Boolean(json.success),
      code: json.code,
      error: json.error,
      slotStart: json.slotStart
    };
  } catch {
    return {
      ok: false,
      error: "We couldn't reach GRWTEE. Check your connection and try again."
    };
  }
}

const panel = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: EASE } }
};

function Reschedule({
  token,
  current,
  tz,
  onDone,
  onBack
}: {
  token: string;
  current: string;
  tz: string;
  onDone: (slotStart: string) => void;
  onBack: () => void;
}) {
  const { state, reload } = useSlots();
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (!value) {
      setError("Choose a new time.");
      return;
    }
    setSaving(true);
    const result = await post(token, {
      action: "reschedule",
      slotStart: value
    });
    setSaving(false);
    if (result.ok && result.slotStart) {
      onDone(result.slotStart);
      return;
    }
    if (result.code === "slot_taken") {
      const fresh = await reload();
      const next = fresh ? nearestSlot(fresh, value) : null;
      setValue(next);
      setError(
        next
          ? `That time was just taken. We've selected ${formatDay(next, tz)} at ${formatTime(next, tz)} instead.`
          : result.error
      );
      return;
    }
    setError(result.error ?? "We couldn't change the time. Try again.");
  };

  return (
    <motion.div key="reschedule" {...panel} className="mt-10">
      {/* Keeps the picker's shared-layout pills from holding this panel's exit open. */}
      <PresenceContext.Provider value={null}>
        <p className="font-body text-sm text-lilac">
          Currently {formatDay(current, tz)} at {formatTime(current, tz)}. Pick a new time:
        </p>
        <div className="mt-5">
          <SlotPicker
            state={state}
            onRetry={() => void reload()}
            value={value}
            onChange={(s) => {
              setValue(s);
              setError(undefined);
            }}
            tz={tz}
          />
        </div>
        <FieldError message={error} />
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <PrimaryButton type="button" onClick={confirm} loading={saving}>
            Confirm New Time
          </PrimaryButton>
          <button type="button" onClick={onBack} className="font-body text-sm text-lilac hover:text-cream">
            Keep current time
          </button>
        </div>
      </PresenceContext.Provider>
    </motion.div>
  );
}

export function ManageBooking({ token, initial }: { token: string; initial: ManageInitial }) {
  const reduce = useReducedMotion();
  const tz = useMemo(() => viewerTimeZone(), []);
  const [booking, setBooking] = useState(initial);
  const [mode, setMode] = useState<Mode>("view");
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [cancelling, setCancelling] = useState(false);

  const cancelled = booking.status === "cancelled";
  const local = formatTime(booking.slotStart, tz);
  const lagos = formatTime(booking.slotStart, "Africa/Lagos");

  const cancel = async () => {
    setCancelling(true);
    const result = await post(token, { action: "cancel" });
    setCancelling(false);
    if (!result.ok) {
      setError(result.error ?? "We couldn't cancel. Try again.");
      return;
    }
    setBooking((b) => ({ ...b, status: "cancelled", canChange: false }));
    setMode("view");
    setNotice(undefined);
  };

  const title = cancelled
    ? "Your consultation is cancelled."
    : booking.canChange
      ? `Your consultation, ${booking.name.split(" ")[0]}.`
      : "This consultation has passed.";

  return (
    <div className="relative min-h-svh overflow-hidden bg-night text-cream">
      <AmbientLight />
      <div className="relative flex h-16 items-center px-5 md:px-12 lg:px-20">
        <Link href="/" aria-label="GRWTEE home">
          <Image
            src="/logo.svg"
            alt="GRWTEE"
            width={110}
            height={20}
            className="brightness-0 invert"
            style={{ width: 110, height: "auto" }}
            priority
          />
        </Link>
      </div>

      <main className="relative mx-auto w-full max-w-xl px-5 pb-20 pt-10 md:pt-16">
        <p className="font-body text-sm text-gold">GRWTEE x Lagos in December</p>
        <RevealText
          key={title}
          text={title}
          className="mt-3 font-cormorant text-[2.5rem] font-light leading-[1.05] text-cream md:text-[3.25rem]"
        />

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, rotate: -1.5 }}
          animate={{ opacity: cancelled ? 0.6 : 1, y: 0, rotate: 0 }}
          transition={{
            delay: 0.3,
            type: "spring",
            stiffness: 120,
            damping: 16
          }}
          className="mt-8 rounded-2xl bg-cream px-7 py-7 text-night shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]"
        >
          <p
            className={`font-cormorant text-3xl leading-tight text-purple-dark lining-nums ${cancelled ? "line-through decoration-1" : ""}`}
          >
            {formatDay(booking.slotStart, tz)}
          </p>
          <p className="mt-1 font-body text-lg tabular-nums lining-nums text-night">
            {local}
            {local !== lagos ? <span className="text-night/60"> your time, {lagos} in Lagos</span> : null}
          </p>
          {booking.meetUrl && !cancelled ? (
            <a
              href={booking.meetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block font-body text-sm text-purple-dark underline underline-offset-4 hover:text-purple-medium"
            >
              Join on Google Meet
            </a>
          ) : (
            <p className="mt-1 font-body text-sm text-night/60">30 minutes on Google Meet</p>
          )}
        </motion.div>

        {notice ? (
          <p role="status" className="mt-5 font-body text-sm text-gold">
            {notice}
          </p>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          {mode === "reschedule" ? (
            <Reschedule
              key="reschedule"
              token={token}
              current={booking.slotStart}
              tz={tz}
              onBack={() => setMode("view")}
              onDone={(slotStart) => {
                setBooking((b) => ({ ...b, slotStart }));
                setMode("view");
                setNotice("Done. Your calendar invite has been updated with the new time.");
              }}
            />
          ) : mode === "cancel" ? (
            <motion.div key="cancel" {...panel} className="mt-10 rounded-2xl border border-night-line p-6">
              <p className="font-body text-base leading-relaxed text-cream">
                Cancel your consultation on {formatDay(booking.slotStart, tz)} at {local}? The consultation fee is
                non-refundable.
              </p>
              <FieldError message={error} />
              <div className="mt-6 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={cancel}
                  disabled={cancelling}
                  className="inline-flex min-h-[48px] items-center gap-3 rounded-full border border-coral/70 px-7 font-accent text-sm font-semibold text-coral transition-colors hover:bg-coral/10 disabled:opacity-60"
                >
                  {cancelling ? (
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-coral/30 border-t-coral"
                      aria-hidden="true"
                    />
                  ) : null}
                  Yes, Cancel It
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("view");
                    setError(undefined);
                  }}
                  className="font-body text-sm text-lilac hover:text-cream"
                >
                  Keep my booking
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="view" {...panel} className="mt-10 flex flex-wrap items-center gap-5">
              {booking.canChange ? (
                <>
                  <PrimaryButton
                    type="button"
                    onClick={() => {
                      setMode("reschedule");
                      setNotice(undefined);
                    }}
                  >
                    Change Time
                  </PrimaryButton>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("cancel");
                      setNotice(undefined);
                    }}
                    className="font-body text-sm text-lilac underline-offset-4 hover:text-cream hover:underline"
                  >
                    Cancel consultation
                  </button>
                </>
              ) : cancelled ? (
                <Link
                  href="/december"
                  className="inline-flex min-h-[52px] items-center rounded-full bg-gold px-9 font-accent text-base font-semibold text-night hover:bg-gold-light"
                >
                  Book a New Time
                </Link>
              ) : (
                <p className="font-body text-sm text-lilac">
                  Need anything? Email{" "}
                  <a href="mailto:book@grwtee.com" className="text-cream underline underline-offset-4">
                    book@grwtee.com
                  </a>
                  .
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
