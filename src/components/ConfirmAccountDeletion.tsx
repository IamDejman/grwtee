"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/** /delete-account/confirm: deletes the account the emailed link is for, after one more click. */
export function ConfirmAccountDeletion({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "deleted" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function confirmDeletion() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/account-deletion/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !data?.success) {
        setStatus("error");
        setMessage(data?.error || "We couldn't delete the account. Try again.");
        return;
      }
      setStatus("deleted");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  if (status === "deleted") {
    return (
      <div className="rounded-lg border border-green-dark/30 bg-green-dark/5 px-4 py-6" role="status">
        <p className="font-heading text-lg font-semibold text-green-dark">Your account is deleted</p>
        <p className="mt-2 text-sm leading-6 text-gray-dark/80">
          Your GRWTEE app account and everything in it have been deleted. Thank you for being part of GRWTEE.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p>
        This permanently deletes your GRWTEE app account: your profile, photos, wardrobe, lookbooks, plans, messages,
        comments and try-ons. It can&apos;t be undone.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="danger" loading={status === "loading"} onClick={() => void confirmDeletion()}>
          Delete my account
        </Button>
        <Link href="/" className="inline-flex items-center px-4 text-sm font-semibold text-green-dark">
          Keep my account
        </Link>
      </div>
      {status === "error" && message ? (
        <p className="text-sm text-red-600" role="alert">
          {message}{" "}
          <Link href="/delete-account" className="underline">
            Ask for a new link
          </Link>
        </p>
      ) : null}
    </div>
  );
}
