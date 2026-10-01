import type { DecemberBooking, PaymentAccount } from "@prisma/client";
import { getConfig } from "@/lib/config";
import { escapeHtml } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { decryptPaymentAccounts } from "@/lib/security/payment-account-crypto";
import { briefRows, describeDeadline, describeSlot, formatSlot, whatsappLink } from "./format";
import { feeLabel, getSettings } from "./settings";

/**
 * December emails. Inline styles only; palette mirrors the /december flow (night, gold, cream).
 * Every send is best effort: failures are logged and never undo a booking.
 */

const C = {
  night: "#160F1F",
  gold: "#CF9D4E",
  cream: "#F5F3E7",
  ink: "#2A2233",
  muted: "#6B6177",
  line: "#E6E0D2",
  purple: "#422D64"
};

const e = escapeHtml;

function layout(inner: string, preheader: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only"></head><body style="margin:0;padding:0;background:${C.night};">
<div style="display:none;max-height:0;overflow:hidden;">${e(preheader)}</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${C.night};">
  <tr><td style="padding:40px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto;">
      <tr><td style="padding:0 8px 24px;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:0.14em;color:${C.cream};">GRWTEE</td></tr>
      <tr><td style="background:${C.cream};border-radius:16px;padding:36px 32px;font-family:Helvetica,Arial,sans-serif;color:${C.ink};">
        ${inner}
      </td></tr>
      <tr><td style="padding:24px 8px 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#B3A6C6;">
        GRWTEE x Lagos in December. Questions? Reply to this email or write to book@grwtee.com.
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

const eyebrow = (text: string) =>
  `<p style="margin:0 0 8px;font-size:13px;color:${C.muted};">${e(text)}</p>`;
const title = (text: string) =>
  `<h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:32px;line-height:1.15;color:${C.ink};">${e(text)}</h1>`;
const para = (html: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.ink};">${html}</p>`;
const button = (href: string, label: string) =>
  `<a href="${e(href)}" style="display:inline-block;padding:14px 28px;background:${C.gold};color:${C.night};text-decoration:none;font-size:14px;font-weight:bold;border-radius:999px;">${e(label)}</a>`;
const link = (href: string, label: string) =>
  `<a href="${e(href)}" style="color:${C.purple};text-decoration:underline;">${e(label)}</a>`;

function slotBlock(b: Pick<DecemberBooking, "slotStart" | "timezone" | "meetUrl">): string {
  const local = formatSlot(b.slotStart, b.timezone);
  const lagos = formatSlot(b.slotStart, "Africa/Lagos");
  const differs = local.time !== lagos.time || local.day !== lagos.day;
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px dashed ${C.line};border-bottom:1px dashed ${C.line};margin:0 0 24px;">
  <tr><td style="padding:20px 0;">
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${C.purple};">${e(local.day)}</p>
    <p style="margin:6px 0 0;font-size:17px;color:${C.ink};">${e(local.time)}<span style="color:${C.muted};">${differs ? ` your time, ${e(lagos.time)} in Lagos` : " Lagos time"}</span></p>
    <p style="margin:6px 0 0;font-size:14px;color:${C.muted};">30 minutes on Google Meet${b.meetUrl ? ` &middot; ${link(b.meetUrl, "Join link")}` : ""}</p>
  </td></tr>
</table>`;
}

function rowsTable(rows: [string, string][]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;">${rows
    .map(
      ([label, value]) => `<tr>
    <td valign="top" style="padding:8px 16px 8px 0;width:120px;font-size:13px;color:${C.muted};">${e(label)}</td>
    <td valign="top" style="padding:8px 0;font-size:14px;line-height:1.55;color:${C.ink};">${e(value).replace(/\n/g, "<br/>")}</td>
  </tr>`
    )
    .join("")}</table>`;
}

function accountLines(a: PaymentAccount): string[] {
  const lines = [`${a.label} (${a.currency})`];
  if (a.type === "bank") {
    if (a.bankName) lines.push(`Bank: ${a.bankName}`);
    if (a.accountName) lines.push(`Account name: ${a.accountName}`);
    if (a.accountNumber) lines.push(`Account number: ${a.accountNumber}`);
    if (a.sortCode) lines.push(`Sort code: ${a.sortCode}`);
    if (a.iban) lines.push(`IBAN: ${a.iban}`);
    if (a.swiftCode) lines.push(`SWIFT: ${a.swiftCode}`);
  } else if (a.email) {
    lines.push(`${a.type === "paypal" ? "PayPal" : a.type === "wise" ? "Wise" : "Email"}: ${a.email}`);
  }
  if (a.notes) lines.push(a.notes);
  return lines;
}

/** Fee and payment accounts. A held booking's email states the deadline itself, so `held` skips the reminder. */
export async function paymentSection(held = false): Promise<{ html: string; text: string }> {
  const fee = feeLabel(await getSettings());
  if (!fee) return { html: "", text: "" };
  const accounts = decryptPaymentAccounts(
    await prisma.paymentAccount.findMany({ where: { active: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] })
  );
  const blocks = accounts.map(accountLines);
  const terms = "The fee secures your consultation and is non-refundable.";
  const html = `<h2 style="margin:8px 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:22px;color:${C.ink};">Consultation fee: ${e(fee)}</h2>
${para(held ? terms : `${terms} Please pay before your call and reply to this email with your receipt.`)}
${blocks
  .map(
    (lines) =>
      `<p style="margin:0 0 12px;padding:14px 16px;background:#FFFFFF;border:1px solid ${C.line};border-radius:10px;font-size:14px;line-height:1.6;color:${C.ink};"><strong>${e(lines[0])}</strong><br/>${lines.slice(1).map(e).join("<br/>")}</p>`
  )
  .join("")}`;
  const text = [
    `Consultation fee: ${fee}`,
    held ? terms : `${terms} Please pay before your call and reply with your receipt.`,
    "",
    ...blocks.map((lines) => lines.join("\n") + "\n")
  ].join("\n");
  return { html, text };
}

async function stylistInbox(): Promise<string> {
  return (await getConfig("CONTACT_EMAIL", process.env.CONTACT_EMAIL || "book@grwtee.com")) ?? "book@grwtee.com";
}

async function send(to: string, subject: string, html: string, text: string, replyTo?: string): Promise<boolean> {
  const { error } = await sendEmail({ to, subject, html, text, replyTo });
  if (error) console.error("[December] Email failed: %s", subject);
  return !error;
}

const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;

// ---------------------------------------------------------------------------------------------

export interface Email {
  subject: string;
  html: string;
  text: string;
}

export function confirmationEmail(b: DecemberBooking, manageUrl: string, payment: { html: string; text: string }): Email {
  const html = layout(
    `${eyebrow("GRWTEE x Lagos in December")}
${title(`You're booked, ${first(b.name)}.`)}
${slotBlock(b)}
${para("Your calendar invite with the Google Meet link is on its way from book@grwtee.com. We'll use your brief to prepare, so come ready to talk through your December.")}
${payment.html}
<p style="margin:24px 0 8px;">${button(manageUrl, "Reschedule or cancel")}</p>
<h2 style="margin:28px 0 8px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:20px;color:${C.ink};">Your brief</h2>
${rowsTable(briefRows(b))}`,
    `Your December consultation: ${describeSlot(b.slotStart, b.timezone)}`
  );
  const text = [
    `You're booked, ${first(b.name)}.`,
    "",
    describeSlot(b.slotStart, b.timezone),
    "30 minutes on Google Meet" + (b.meetUrl ? `: ${b.meetUrl}` : ""),
    "",
    "Your calendar invite with the Meet link is on its way from book@grwtee.com.",
    "",
    payment.text,
    `Reschedule or cancel: ${manageUrl}`,
    "",
    "Your brief",
    ...briefRows(b).map(([l, v]) => `${l}: ${v}`)
  ].join("\n");
  return { subject: `You're booked: ${formatSlot(b.slotStart, b.timezone).day}`, html, text };
}

/** Sent when a booking is held pending payment: the time, the deadline and how to pay. No invite yet. */
export function holdEmail(b: DecemberBooking, manageUrl: string, payment: { html: string; text: string }): Email {
  const deadline = describeDeadline(b.holdExpiresAt ?? b.slotStart, b.timezone);
  const html = layout(
    `${eyebrow("GRWTEE x Lagos in December")}
${title(`Your time is held, ${first(b.name)}.`)}
${slotBlock({ ...b, meetUrl: null })}
${para(`We're holding this time for you until <strong>${e(deadline)}</strong>. Pay the consultation fee and reply to this email with your receipt.`)}
${para("Once we confirm your payment, we'll send your calendar invite with the Google Meet link. If payment isn't confirmed by then, the time is released.")}
${payment.html}
<p style="margin:24px 0 8px;">${button(manageUrl, "Change time or cancel")}</p>
<h2 style="margin:28px 0 8px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:20px;color:${C.ink};">Your brief</h2>
${rowsTable(briefRows(b))}`,
    `Pay by ${deadline} to confirm your December consultation`
  );
  const text = [
    `Your time is held, ${first(b.name)}.`,
    "",
    describeSlot(b.slotStart, b.timezone),
    "30 minutes on Google Meet",
    "",
    `We're holding this time for you until ${deadline}. Pay the consultation fee and reply to this email with your receipt.`,
    "Once we confirm your payment, we'll send your calendar invite with the Google Meet link. If payment isn't confirmed by then, the time is released.",
    "",
    payment.text,
    `Change time or cancel: ${manageUrl}`,
    "",
    "Your brief",
    ...briefRows(b).map(([l, v]) => `${l}: ${v}`)
  ].join("\n");
  return { subject: `Your time is held: ${formatSlot(b.slotStart, b.timezone).day}`, html, text };
}

export async function sendConfirmation(b: DecemberBooking, manageUrl: string): Promise<boolean> {
  const email =
    b.status === "pending"
      ? holdEmail(b, manageUrl, await paymentSection(true))
      : confirmationEmail(b, manageUrl, await paymentSection());
  return send(b.email, email.subject, email.html, email.text, await stylistInbox());
}

/** Sent when the stylist marks a held booking paid; Google sends the invite alongside it. */
export function paidEmail(b: DecemberBooking): Email {
  const heading = `You're booked, ${first(b.name)}.`;
  const html = layout(
    `${eyebrow("GRWTEE x Lagos in December")}
${title(heading)}
${slotBlock(b)}
${para("Payment received, thank you. Your calendar invite with the Google Meet link is on its way from book@grwtee.com. We'll use your brief to prepare, so come ready to talk through your December.")}
${b.meetUrl ? `<p style="margin:8px 0 16px;">${button(b.meetUrl, "Join Google Meet")}</p>` : ""}
${para("Need to change the time? Use the link in your first email, or reply to this one.")}`,
    `Payment received. Your December consultation: ${describeSlot(b.slotStart, b.timezone)}`
  );
  const text = [
    heading,
    "",
    describeSlot(b.slotStart, b.timezone),
    "30 minutes on Google Meet" + (b.meetUrl ? `: ${b.meetUrl}` : ""),
    "",
    "Payment received, thank you. Your calendar invite with the Meet link is on its way from book@grwtee.com.",
    "",
    "Need to change the time? Use the link in your first email, or reply to this one."
  ].join("\n");
  return { subject: `You're booked: ${formatSlot(b.slotStart, b.timezone).day}`, html, text };
}

export async function sendPaid(b: DecemberBooking): Promise<boolean> {
  const email = paidEmail(b);
  return send(b.email, email.subject, email.html, email.text, await stylistInbox());
}

/** Sent when a hold lapses without payment and the time is released. */
export function expiredEmail(b: DecemberBooking, siteUrl: string): Email {
  const heading = "Your hold has lapsed.";
  const bookUrl = `${siteUrl.replace(/\/$/, "")}/december`;
  const slot = describeSlot(b.slotStart, b.timezone);
  const html = layout(
    `${eyebrow("GRWTEE x Lagos in December")}
${title(heading)}
${para(`We didn't receive payment in time for your consultation on ${e(slot)}, so the time has been released.`)}
${para("Already paid? Reply to this email with your receipt and we'll sort it out.")}
<p style="margin:8px 0 16px;">${button(bookUrl, "Book a new time")}</p>`,
    `${heading} ${slot}`
  );
  const text = [
    heading,
    "",
    `We didn't receive payment in time for your consultation on ${slot}, so the time has been released.`,
    "Already paid? Reply to this email with your receipt and we'll sort it out.",
    "",
    `Book a new time: ${bookUrl}`
  ].join("\n");
  return { subject: "Your December consultation hold has lapsed", html, text };
}

export async function sendExpired(b: DecemberBooking, siteUrl: string): Promise<boolean> {
  const email = expiredEmail(b, siteUrl);
  return send(b.email, email.subject, email.html, email.text, await stylistInbox());
}

type StylistEvent =
  | { kind: "booked" }
  | { kind: "rescheduled"; previousStart: Date }
  | { kind: "cancelled" }
  | { kind: "expired" };

export function stylistEmail(b: DecemberBooking, event: StylistEvent, siteUrl: string): Email {
  const lagos = describeSlot(b.slotStart, "Africa/Lagos");
  const adminUrl = `${siteUrl.replace(/\/$/, "")}/admin/december`;
  const heading =
    event.kind === "booked"
      ? `New booking: ${b.name}`
      : event.kind === "rescheduled"
        ? `${b.name} moved their consultation`
        : event.kind === "expired"
          ? `${b.name}'s hold lapsed`
          : `${b.name} cancelled`;
  const detail =
    event.kind === "rescheduled"
      ? `From ${describeSlot(event.previousStart, "Africa/Lagos")} to ${lagos}.`
      : event.kind === "cancelled"
        ? `Was ${lagos}. The slot is open again.`
        : event.kind === "expired"
          ? `Not marked paid within 24 hours. ${lagos} is open again.`
          : (b.timezone === "Africa/Lagos"
              ? `${lagos}.`
              : `${lagos}. That's ${formatSlot(b.slotStart, b.timezone).time} for the client (${b.timezone.replace(/_/g, " ")}).`) +
            (b.status === "pending" && b.holdExpiresAt
              ? ` Awaiting payment: held until ${describeSlot(b.holdExpiresAt, "Africa/Lagos")}. Mark paid in admin to send the calendar invite.`
              : "");
  const contact: [string, string][] = [
    ["Email", b.email],
    ["WhatsApp", b.whatsapp]
  ];
  const html = layout(
    `${eyebrow("December bookings")}
${title(heading)}
${para(e(detail))}
${rowsTable(event.kind === "booked" ? [...contact, ...briefRows(b)] : contact)}
<p style="margin:8px 0 0;">${button(adminUrl, "Open in admin")}&nbsp;&nbsp; ${link(whatsappLink(b.whatsapp), "WhatsApp")}</p>`,
    detail
  );
  const text = [heading, "", detail, "", ...contact.map(([l, v]) => `${l}: ${v}`), "", adminUrl].join("\n");
  return { subject: heading, html, text };
}

export async function notifyStylist(b: DecemberBooking, event: StylistEvent, siteUrl: string): Promise<boolean> {
  const email = stylistEmail(b, event, siteUrl);
  return send(await stylistInbox(), email.subject, email.html, email.text, b.email);
}

export function reminderEmail(b: DecemberBooking): Email {
  const heading = "Your consultation is tomorrow.";
  const html = layout(
    `${eyebrow("GRWTEE x Lagos in December")}
${title(heading)}
${slotBlock(b)}
${para("Join from a quiet spot with good light, and have your December dates and any outfit pictures or Pinterest boards handy.")}
${b.meetUrl ? `<p style="margin:8px 0 16px;">${button(b.meetUrl, "Join Google Meet")}</p>` : ""}
${para("Need to change the time? Use the link in your confirmation email, or reply to this one.")}`,
    `${heading} ${describeSlot(b.slotStart, b.timezone)}`
  );
  const text = [
    heading,
    "",
    describeSlot(b.slotStart, b.timezone),
    b.meetUrl ? `Join: ${b.meetUrl}` : "",
    "",
    "Need to change the time? Use the link in your confirmation email, or reply to this one."
  ].join("\n");
  return { subject: "Tomorrow: your GRWTEE consultation", html, text };
}

/** Returns whether the email was accepted, so the reminder job can retry on its next run. */
export async function sendReminder(b: DecemberBooking): Promise<boolean> {
  const email = reminderEmail(b);
  return send(b.email, email.subject, email.html, email.text, await stylistInbox());
}
