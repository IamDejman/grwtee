import { getAuthOptions } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { bookingConfirmationHtml, bookingNotificationHtml, escapeHtml } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { formatBookingMessage, formatServiceLabel } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export const revalidate = 300;

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  service: z.string().min(2),
  message: z.string().min(2)
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(await getAuthOptions());
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const data = await prisma.bookingRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit
    });
    const total = await prisma.bookingRequest.count({ where });
    return NextResponse.json({ success: true, data, total });
  } catch (err) {
    console.error("[Bookings GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to load bookings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  try {
    await prisma.bookingRequest.create({ data });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string; message?: string };
    console.error(
      "[Bookings POST] create failed:",
      prismaErr?.code ?? "unknown",
      prismaErr?.message ?? err
    );
    return NextResponse.json(
      { success: false, error: "Failed to save booking request" },
      { status: 500 }
    );
  }

  // Send notification to CONTACT_EMAIL (e.g. book@grwtee.com) and confirmation to client via Resend
  try {
    const contactEmail = await getConfig("CONTACT_EMAIL", process.env.CONTACT_EMAIL || "book@grwtee.com");
    const siteUrl = await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL || "https://grwtee.com");

    console.log("[Bookings] Sending notification to %s and confirmation to %s", contactEmail, data.email);

    const notificationText = [
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
      subject: "New Booking Request",
      html: notificationHtml,
      text: notificationText
    });
    if (notifResult.error) {
      console.error("[Bookings] Notification email failed:", notifResult.error);
    }

    const confirmationText = [
      `Hi ${data.name},`,
      "",
      "Thank you for reaching out to GRWTEE. We've received your booking request and will get back to you within 24–48 hours.",
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
      subject: "We received your request | GRWTEE",
      html: confirmationHtml,
      text: confirmationText
    });
    if (confirmResult.error) {
      console.error("[Bookings] Confirmation email failed:", confirmResult.error);
    }
  } catch (e) {
    console.error("[Bookings] Email error:", e);
  }

  return NextResponse.json({
    success: true,
    message: "Booking request submitted"
  });
}


