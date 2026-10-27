"use client";

import { useCallback, useState } from "react";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

const enabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

/**
 * Turnstile for a small form. The check loads once someone starts filling
 * the form in rather than on every page view, and a fresh one comes after
 * each submit because a token only works once.
 */
export function useTurnstile() {
  const [armed, setArmed] = useState(false);
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);

  const arm = useCallback(() => setArmed(true), []);
  const reset = useCallback(() => {
    setToken("");
    setRound((r) => r + 1);
  }, []);

  return {
    /** Call when someone starts on the form, e.g. on focus. */
    arm,
    /** Call after each submit. */
    reset,
    token,
    /** False while the check hasn't finished. */
    ready: !enabled || token !== "",
    widget: enabled && armed ? <TurnstileWidget key={round} onToken={setToken} /> : null
  };
}
