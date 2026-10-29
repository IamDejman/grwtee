import { getConfig } from "@/lib/config";
import { Resend } from "resend";

const DEFAULT_FROM = "GRWTEE <onboarding@resend.dev>";

// Logs name the recipient's domain only, and no subject: subjects can
// include a client's name (WEB-24).
function recipientForLog(to: string): string {
  const at = to.lastIndexOf("@");
  return at >= 0 ? `*${to.slice(at)}` : "*";
}

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

/**
 * Send an email via Resend. Uses RESEND_API_KEY and RESEND_FROM from config/env.
 * Returns { error } if Resend is not configured or send fails.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ error?: unknown }> {
  const apiKey = await getConfig("RESEND_API_KEY", process.env.RESEND_API_KEY);
  const from = await getConfig("RESEND_FROM", process.env.RESEND_FROM || DEFAULT_FROM);

  if (!apiKey) {
    console.error("[Resend] RESEND_API_KEY is not set");
    return { error: new Error("RESEND_API_KEY is not set") };
  }

  const fromAddress = from ?? DEFAULT_FROM;
  console.log("[Resend] Sending email to=%s", recipientForLog(options.to));

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo
  });

  if (error) {
    const message = String((error as { message?: string })?.message ?? error);
    console.error("[Resend] Send failed to=%s error=%s", recipientForLog(options.to), message);
    if (message.includes("domain is not verified")) {
      console.error(
        "[Resend] Fix: verify your domain at https://resend.com/domains or set RESEND_FROM to GRWTEE <onboarding@resend.dev> (admin Settings → Env Vars)"
      );
    }
    return { error };
  }

  console.log("[Resend] Sent to=%s id=%s", recipientForLog(options.to), (data as { id?: string })?.id ?? "-");
  return {};
}

export type BatchEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export type BatchResult =
  /** One entry per email, in order: Resend's id, or why that address was refused. */
  | { ok: true; results: ({ id: string | null } | { error: string })[] }
  /** Nothing in the batch was sent, or (status 5xx or none) it's unknown whether it was. */
  | { ok: false; code: string; message: string; statusCode: number | null };

/**
 * Sends up to 100 emails in one Resend call. Sending the same batch again
 * with the same idempotency key within 24 hours returns the first result
 * instead of sending twice. One bad address doesn't stop the others.
 */
export async function sendEmailBatch(emails: BatchEmail[], idempotencyKey: string): Promise<BatchResult> {
  const apiKey = await getConfig("RESEND_API_KEY", process.env.RESEND_API_KEY);
  if (!apiKey) {
    console.error("[Resend] RESEND_API_KEY is not set");
    return { ok: false, code: "missing_api_key", message: "RESEND_API_KEY is not set", statusCode: null };
  }
  const from = (await getConfig("RESEND_FROM", process.env.RESEND_FROM || DEFAULT_FROM)) ?? DEFAULT_FROM;

  try {
    const { data, error } = await new Resend(apiKey).batch.send(
      emails.map((email) => ({ from, ...email })),
      { idempotencyKey, batchValidation: "permissive" }
    );
    if (error) {
      console.error("[Resend] Batch failed size=%d error=%s", emails.length, error.message);
      return { ok: false, code: error.name, message: error.message, statusCode: error.statusCode };
    }

    // Ids come back for the emails that were accepted, in order, and errors by index.
    const refused = new Map((data.errors ?? []).map((e) => [e.index, e.message]));
    const ids = data.data.map((d) => d.id);
    const idsLineUp = ids.length === emails.length - refused.size;
    let next = 0;
    const results = emails.map((_, i) => {
      const reason = refused.get(i);
      if (reason !== undefined) return { error: reason };
      return { id: idsLineUp ? ids[next++] : null };
    });
    console.log("[Resend] Batch sent size=%d refused=%d", emails.length, refused.size);
    return { ok: true, results };
  } catch (e) {
    // A network failure: Resend may or may not have the batch.
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Resend] Batch request failed size=%d error=%s", emails.length, message);
    return { ok: false, code: "network_error", message, statusCode: null };
  }
}
