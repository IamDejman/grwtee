"use client";

import { useState } from "react";

type Variant = "light" | "dark";

export function WaitlistForm({
  variant = "light",
  source = "inner-circle"
}: {
  variant?: Variant;
  source?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name.trim() || undefined,
          source
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Try again.");
        return;
      }
      setStatus("success");
      setMessage(data.message || "You're on the list.");
      setName("");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  const isDark = variant === "dark";

  if (status === "success") {
    return (
      <div
        className={`rounded-lg px-4 py-6 text-center ${
          isDark
            ? "border border-white/30 bg-white/10 text-white"
            : "border border-green-dark/30 bg-green-dark/5"
        }`}
      >
        <p
          className={`font-heading text-lg font-semibold ${
            isDark ? "text-white" : "text-green-dark"
          }`}
        >
          You're on the list.
        </p>
        <p
          className={`mt-2 text-sm leading-6 ${
            isDark ? "text-white/80" : "text-gray-dark/80"
          }`}
        >
          {message}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMessage(null);
          }}
          className={`mt-4 text-xs font-medium underline ${
            isDark ? "text-white/90" : "text-green-dark"
          }`}
        >
          Add another email
        </button>
      </div>
    );
  }

  const inputClass = isDark
    ? "w-full rounded-md border border-white/30 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 outline-none transition focus:border-white disabled:opacity-60"
    : "w-full rounded-md border border-gray-medium px-4 py-3 text-sm outline-none transition focus:border-green-dark disabled:opacity-60";

  const labelClass = isDark
    ? "block text-sm font-semibold text-white"
    : "block text-sm font-semibold text-gray-dark";

  const buttonClass = isDark
    ? "w-full rounded-full bg-white px-6 py-3 font-accent text-sm font-semibold text-purple-dark transition hover:bg-cream disabled:opacity-60"
    : "w-full rounded-full bg-green-dark px-6 py-3 font-accent text-sm font-semibold text-white transition hover:bg-purple-medium disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor={`waitlist-name-${variant}`} className={labelClass}>
          Name <span className={isDark ? "text-white/60" : "text-gray-dark/50"}>(optional)</span>
        </label>
        <input
          id={`waitlist-name-${variant}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your first name"
          disabled={status === "loading"}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <div>
        <label htmlFor={`waitlist-email-${variant}`} className={labelClass}>
          Email address
        </label>
        <input
          id={`waitlist-email-${variant}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={status === "loading"}
          className={`mt-1 ${inputClass}`}
        />
      </div>
      <button type="submit" disabled={status === "loading"} className={buttonClass}>
        {status === "loading" ? "Joining…" : "Join the Waiting List"}
      </button>
      {status === "error" && message && (
        <p
          className={`text-sm ${isDark ? "text-red-200" : "text-red-600"}`}
          role="alert"
        >
          {message}
        </p>
      )}
    </form>
  );
}
