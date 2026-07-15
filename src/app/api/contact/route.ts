import { getConfig } from "@/lib/config";
import { bookingConfirmationHtml, bookingNotificationHtml, escapeHtml } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { formatBookingMessage, formatServiceLabel } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseEmail } from "@/lib/security/email-validation";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { requestMeta } from "@/lib/security/audit-log";

const schema = z.object({
  name: z.string().min(2),
  email: z.string(),
  phone: z.string().min(6),
  service: z.string().min(2),
  message: z.string().min(2)
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const emailResult = parseEmail(parsed.data.email);
  if (!emailResult.ok) {
    return NextResponse.json({ success: false, error: emailResult.message }, { status: 400 });
  }

  const meta = requestMeta(req);
  const captcha = await verifyTurnstileToken(
    (json as { turnstileToken?: string })?.turnstileToken,
    meta.ip
  );
  if (!captcha.ok) {
    return NextResponse.json({ success: false, error: captcha.message }, { status: 400 });
  }

  const data = { ...parsed.data, email: emailResult.email };
  await prisma.bookingRequest.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      service: data.service,
      message: data.message
    }
  });

  try {
    const contactEmail = await getConfig("CONTACT_EMAIL", process.env.CONTACT_EMAIL || "book@grwtee.com");
    const siteUrl = await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL || "https://grwtee.com");

    console.log("[Contact] Sending notification to %s and confirmation to %s", contactEmail, data.email);

    const notificationText = [
      "New booking request received:",
      "",
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone}`,
      `Service: ${formatServiceLabel(data.service)}`,
      "",
      "Message:",
      formatBookingMessage(data.message)
    ].join("\n");
    const messageFormatted = formatBookingMessage(data.message);
    const messageHtml = escapeHtml(messageFormatted).replace(/\n/g, "<br/>");
    const notificationHtml = bookingNotificationHtml({
      name: data.name,
      email: data.email,
      phone: data.phone,
      serviceLabel: formatServiceLabel(data.service),
      messageHtml,
      siteUrl: siteUrl ?? "https://grwtee.com"
    });
    const notifResult = await sendEmail({
      to: contactEmail ?? "book@grwtee.com",
      subject: "New Contact / Booking Request",
      html: notificationHtml,
      text: notificationText
    });
    if (notifResult.error) {
      console.error("[Contact] Notification email failed:", notifResult.error);
    }

    const confirmationText = [
      `Hi ${data.name},`,
      "",
      "Thank you for reaching out to GRWTEE. We've received your message and will get back to you within 24–48 hours.",
      "",
      `Service interest: ${formatServiceLabel(data.service)}`,
      "",
      "Warm regards,",
      "GRWTEE"
    ].join("\n");
    const confirmationHtml = bookingConfirmationHtml({
      name: data.name,
      serviceLabel: formatServiceLabel(data.service)
    });
    const confirmResult = await sendEmail({
      to: data.email,
      subject: "We received your message | GRWTEE",
      html: confirmationHtml,
      text: confirmationText
    });
    if (confirmResult.error) {
      console.error("[Contact] Confirmation email failed:", confirmResult.error);
    }
  } catch (e) {
    console.error("[Contact] Email error:", e);
  }

  return NextResponse.json({
    success: true,
    message: "Message sent successfully"
  });
}
