"use client";

import { useMemo, useState } from "react";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { FieldError } from "./primitives";
import { formatDay, formatTime, matchesLagos, nearestSlot, SlotPicker, useSlots, viewerTimeZone } from "./SlotPicker";
import { StepFrame, type StepProps } from "./steps";

export type BookOutcome = { ok: true } | { ok: false; code?: string; message: string };

const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export function TimeStep({
  brief,
  update,
  headingRef,
  onBook
}: Omit<StepProps, "next"> & { onBook: (turnstileToken: string) => Promise<BookOutcome> }) {
  const tz = useMemo(() => viewerTimeZone(), []);
  const { state, reload } = useSlots();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState("");
  // Turnstile tokens are single use: remount the widget after every attempt.
  const [captchaKey, setCaptchaKey] = useState(0);

  const allSlots = state.status === "ready" ? state.days.flatMap(([, s]) => s) : [];
  const isLagos = matchesLagos(allSlots, tz);
  const city = tz.split("/").pop()?.replace(/_/g, " ");
  // A time saved in a resumed draft may have gone; only count it if it's still open.
  const selected = brief.slotStart && allSlots.includes(brief.slotStart) ? brief.slotStart : null;

  return (
    <StepFrame
      title="Choose a time for your consultation."
      helper={
        isLagos
          ? "30 minutes on Google Meet. Times are in Lagos time."
          : `30 minutes on Google Meet. Times are in your time zone (${city}), with Lagos time underneath.`
      }
      headingRef={headingRef}
      cta="Book consultation"
      loading={loading}
      validate={() => {
        const e = !selected
          ? "Choose a time to continue."
          : captchaEnabled && !captcha
            ? "Complete the security check below."
            : undefined;
        setError(e);
        return { slot: e };
      }}
      onValid={async () => {
        setLoading(true);
        const outcome = await onBook(captcha);
        // On success the flow moves to the confirmation and this step unmounts.
        if (outcome.ok) return;
        setLoading(false);
        setCaptcha("");
        setCaptchaKey((k) => k + 1);
        if (outcome.code === "slot_taken" && selected) {
          const fresh = await reload();
          const next = fresh ? nearestSlot(fresh, selected) : null;
          update({ slotStart: next });
          setError(
            next
              ? `That time was just taken. We've selected ${formatDay(next, tz)} at ${formatTime(next, tz)} instead.`
              : outcome.message
          );
        } else {
          setError(outcome.message);
        }
      }}
    >
      <SlotPicker
        state={state}
        onRetry={() => void reload()}
        value={selected}
        onChange={(slot) => {
          update({ slotStart: slot });
          setError(undefined);
        }}
        tz={tz}
      />
      {captchaEnabled ? <TurnstileWidget key={captchaKey} onToken={setCaptcha} /> : null}
      <FieldError message={error} />
    </StepFrame>
  );
}
