"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useTurnstile } from "@/components/security/useTurnstile";

/** /delete-account: asks for the app account's email and sends it a confirmation link. */
export function DeleteAccountForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const captcha = useTurnstile();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (!captcha.ready) {
      captcha.arm();
      setStatus("error");
      setMessage("Finishing a quick check. Try again in a moment.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/account-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: captcha.token })
      });
      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string; error?: string } | null;
      if (!res.ok || !data?.success) {
        setStatus("error");
        setMessage(data?.error || "Something went wrong. Try again.");
        return;
      }
      setStatus("sent");
      setMessage(data.message ?? "Check your inbox for a link to confirm.");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    } finally {
      captcha.reset();
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-lg border border-green-dark/30 bg-green-dark/5 px-4 py-6" role="status">
        <p className="font-heading text-lg font-semibold text-green-dark">Check your inbox</p>
        <p className="mt-2 text-sm leading-6 text-gray-dark/80">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email address you use in the app"
        type="email"
        required
        autoComplete="email"
        maxLength={254}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onFocus={captcha.arm}
        disabled={status === "loading"}
      />
      {captcha.widget}
      <Button type="submit" loading={status === "loading"}>
        Email me a link to delete it
      </Button>
      {status === "error" && message ? (
        <p className="text-sm text-red-600" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
