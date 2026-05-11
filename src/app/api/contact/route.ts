import { getConfig } from "@/lib/config";
import { bookingConfirmationHtml, bookingNotificationHtml, escapeHtml } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { formatBookingMessage, formatServiceLabel } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  service: z.string().min(2),
  message: z.string().min(2)
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
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
