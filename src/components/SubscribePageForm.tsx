"use client";

import { useState } from "react";

export function SubscribePageForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Try again.");
        return;
      }
      setStatus("success");
      setMessage(data.message || "Check your inbox to confirm.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-dark/30 bg-green-dark/5 px-4 py-6 text-center">
        <p className="font-heading text-lg font-semibold text-green-dark">
          Check your inbox
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-dark/80">{message}</p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMessage(null);
          }}
          className="mt-4 text-xs font-medium text-green-dark underline"
        >
          Subscribe another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label
        htmlFor="subscribe-email"
        className="block text-sm font-semibold text-gray-dark"
      >
        Email address
      </label>
      <input
        id="subscribe-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={status === "loading"}
        className="w-full rounded-md border border-gray-medium px-4 py-3 text-sm outline-none transition focus:border-green-dark disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-full bg-green-dark px-6 py-3 font-accent text-sm font-semibold text-white transition hover:bg-purple-medium disabled:opacity-60"
      >
        {status === "loading" ? "Sending…" : "Subscribe"}
      </button>
      {status === "error" && message && (
        <p className="text-sm text-red-600" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
