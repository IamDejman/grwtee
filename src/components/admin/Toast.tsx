"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

type Tone = "success" | "error";
type Item = { id: number; tone: Tone; message: string };
type Api = { success: (message: string) => void; error: (message: string) => void };

const ToastContext = React.createContext<Api | null>(null);

/** Small "Saved" / "Couldn't save" notes after admin actions. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Item[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);

  const push = React.useCallback(
    (tone: Tone, message: string) => {
      const id = ++nextId.current;
      setItems((all) => [...all.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3000);
    },
    [dismiss]
  );

  const api = React.useMemo<Api>(
    () => ({ success: (m) => push("success", m), error: (m) => push("error", m) }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex max-w-sm animate-fade-in-up items-center motion-reduce:animate-none gap-3 rounded-xl bg-atelier-ink py-2.5 pl-3 pr-2 text-sm text-white shadow-xl"
          >
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                t.tone === "success" ? "bg-emerald-500" : "bg-red-500"
              }`}
            >
              {t.tone === "success" ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="rounded-md p-1 text-white/60 hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Api {
  const api = React.useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside ToastProvider");
  return api;
}
