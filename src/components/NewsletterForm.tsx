"use client";

import { useState } from "react";

export function NewsletterForm() {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="newsletter-email" className="font-accent text-sm font-semibold tracking-wider text-gold-light">
        JOIN THE LIST
      </label>
      <p className="text-sm text-cream/80">
        Styling stories, service drops, and the occasional edit, right in your inbox.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={status === "loading"}
          className="min-w-0 flex-1 rounded-full border border-cream/30 bg-cream/10 px-4 py-2 text-sm text-cream placeholder:text-cream/50 focus:border-gold-light focus:outline-none focus:ring-1 focus:ring-gold-light disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-gold-light px-5 py-2 text-sm font-semibold text-purple-dark transition hover:bg-cream disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Subscribe"}
        </button>
      </div>
      {message && (
        <p
          className={`text-xs ${
            status === "success" ? "text-gold-light" : "text-red-300"
          }`}
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  );
}
