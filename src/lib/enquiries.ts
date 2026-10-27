import { z } from "zod";
import { getConfig } from "@/lib/config";
import { bookingConfirmationHtml, bookingNotificationHtml, escapeHtml, greeting } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { formatBookingMessage, formatServiceLabel } from "@/lib/utils";

/**
 * Booking requests (/book) and contact messages (/contact): both are saved
 * as booking requests, emailed to the team, and confirmed to the sender.
 */

/** The services the booking and contact forms offer. */
export const ENQUIRY_SERVICES = [
  "virtual-personal-styling",
  "virtual-wardrobe-styling",
  "wardrobe-revamp",
  "virtual-event-styling",
  "photoshoot-styling",
  "virtual-vacation-styling",
  "personal-shopping",
  "contract-styling",
  "general-inquiry"
] as const;

export const enquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().max(254),
  phone: z.string().trim().min(6).max(40),
  service: z.enum(ENQUIRY_SERVICES),
  // The booking form sends its city and notes as JSON here.
  message: z.string().trim().min(2).max(5000)
});

export type Enquiry = z.infer<typeof enquirySchema>;

const COPY = {
  booking: {
    log: "[Bookings]",
    notificationSubject: "New Booking Request",
    notificationIntro: [] as string[],
    confirmationSubject: "We received your request | GRWTEE",
    received: "We've received your booking request"
  },
  contact: {
    log: "[Contact]",
    notificationSubject: "New Contact / Booking Request",
    notificationIntro: ["New booking request received:", ""],
    confirmationSubject: "We received your message | GRWTEE",
    received: "We've received your message"
  }
};

export async function saveEnquiry(data: Enquiry): Promise<void> {
  await prisma.bookingRequest.create({
    data: { name: data.name, email: data.email, phone: data.phone, service: data.service, message: data.message }
  });
}

/**
 * Emails the team everything that was sent, and the sender a confirmation.
 * The confirmation goes to whatever address was typed in, so it carries
 * nothing else they typed: only a plain first name and the service chosen
 * from the list. Failures are logged, not thrown.
 */
export async function sendEnquiryEmails(kind: keyof typeof COPY, data: Enquiry): Promise<void> {
  const copy = COPY[kind];
  try {
    const contactEmail = await getConfig("CONTACT_EMAIL", process.env.CONTACT_EMAIL || "book@grwtee.com");
    const siteUrl = await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL || "https://grwtee.com");
    const serviceLabel = formatServiceLabel(data.service);
    const message = formatBookingMessage(data.message);

    const notification = await sendEmail({
      to: contactEmail ?? "book@grwtee.com",
      subject: copy.notificationSubject,
      html: bookingNotificationHtml({
        name: data.name,
        email: data.email,
        phone: data.phone,
        serviceLabel,
        messageHtml: escapeHtml(message).replace(/\n/g, "<br/>"),
        siteUrl: siteUrl ?? "https://grwtee.com"
      }),
      text: [
        ...copy.notificationIntro,
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Phone: ${data.phone}`,
        `Service: ${serviceLabel}`,
        "",
        "Message:",
        message
      ].join("\n")
    });
    if (notification.error) console.error(`${copy.log} Notification email failed:`, notification.error);

    const confirmation = await sendEmail({
      to: data.email,
      subject: copy.confirmationSubject,
      html: bookingConfirmationHtml({ name: data.name, serviceLabel }),
      text: [
        greeting(data.name),
        "",
        `Thank you for reaching out to GRWTEE. ${copy.received} and will get back to you within 24–48 hours.`,
        "",
        `Service interest: ${serviceLabel}`,
        "",
        "Warm regards,",
        "GRWTEE"
      ].join("\n")
    });
    if (confirmation.error) console.error(`${copy.log} Confirmation email failed:`, confirmation.error);
  } catch (e) {
    console.error(`${copy.log} Email error:`, e);
  }
}
