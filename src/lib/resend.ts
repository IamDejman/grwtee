import { getConfig } from "@/lib/config";
import { Resend } from "resend";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send an email via Resend. Uses RESEND_API_KEY and RESEND_FROM from config/env.
 * Returns { error } if Resend is not configured or send fails.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ error?: unknown }> {
  const apiKey = await getConfig("RESEND_API_KEY", process.env.RESEND_API_KEY);
  const from = await getConfig(
    "RESEND_FROM",
    process.env.RESEND_FROM || "GRWTEE <onboarding@resend.dev>"
  );

  if (!apiKey) {
    console.error("[Resend] RESEND_API_KEY is not set");
    return { error: new Error("RESEND_API_KEY is not set") };
  }

  const fromAddress = from ?? "GRWTEE <onboarding@resend.dev>";
  console.log("[Resend] Sending email to=%s subject=%s", options.to, options.subject);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text
  });

  if (error) {
    console.error("[Resend] Send failed to=%s subject=%s error=%s", options.to, options.subject, String(error?.message ?? error));
    return { error };
  }

  console.log("[Resend] Sent successfully to=%s id=%s", options.to, (data as { id?: string })?.id ?? "—");
  return {};
}
