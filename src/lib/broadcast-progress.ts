import { adminFetch } from "@/lib/adminFetch";

/** A broadcast's progress as the broadcast routes return it. */
export type BroadcastProgress = {
  id: string;
  subject: string;
  status: "sending" | "sent" | string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  remaining: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
};

/**
 * Asks the server for the next batches until the broadcast is out, sending
 * stops with a reason, or nothing moves (a batch is waiting to be retried).
 * Each request sends for up to about 25 seconds.
 */
export async function keepSending(
  start: BroadcastProgress,
  onProgress: (progress: BroadcastProgress) => void
): Promise<BroadcastProgress> {
  let progress = start;
  while (progress.status === "sending" && !progress.lastError) {
    const before = progress.remaining;
    const res = await adminFetch(`/api/admin/broadcasts/${progress.id}/send`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { success?: boolean; data?: BroadcastProgress; error?: string } | null;
    if (!res.ok || !data?.success || !data.data) throw new Error(data?.error || "Couldn’t carry on sending. Try again.");
    progress = data.data;
    onProgress(progress);
    if (progress.remaining >= before) break;
  }
  return progress;
}

/** While it's going: "Sending… 300 of 1,000." */
export function sendingLine(p: BroadcastProgress): string {
  return `Sending… ${(p.recipientCount - p.remaining).toLocaleString("en-GB")} of ${p.recipientCount.toLocaleString("en-GB")}.`;
}

/** Where a broadcast stands, once a round of sending has stopped. */
export function progressSummary(p: BroadcastProgress): string {
  const counts = `${p.sentCount.toLocaleString("en-GB")} sent${p.failedCount ? `, ${p.failedCount.toLocaleString("en-GB")} failed` : ""}`;
  if (p.status !== "sending") return `${counts}.`;
  if (p.lastError) return `Paused with ${p.remaining.toLocaleString("en-GB")} still to send. ${p.lastError}`;
  return `${counts} so far. ${p.remaining.toLocaleString("en-GB")} are waiting to be retried: continue in a couple of minutes.`;
}
