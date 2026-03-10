import { getAuthOptions } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
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
      "New booking request received:",
      "",
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone}`,
      `Service: ${data.service}`,
      "",
      "Message:",
      data.message
    ].join("\n");
    const notificationHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 12px 0">New booking request</h2>
        <p><b>Name:</b> ${data.name}</p>
        <p><b>Email:</b> ${data.email}</p>
        <p><b>Phone:</b> ${data.phone}</p>
        <p><b>Service:</b> ${data.service}</p>
        <p><b>Message:</b><br/>${String(data.message).replace(/\n/g, "<br/>")}</p>
        <hr/>
        <p style="color:#555">View in admin: <a href="${siteUrl}/admin/bookings">${siteUrl}/admin/bookings</a></p>
      </div>
    `;
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
      `Service interest: ${data.service}`,
      "",
      `In the meantime, you can review our policies here: ${siteUrl}/payment`,
      "",
      "Warm regards,",
      "GRWTEE"
    ].join("\n");
    const confirmationHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <p>Hi ${data.name},</p>
        <p>Thank you for reaching out to <b>GRWTEE</b>. We've received your request and will get back to you within <b>24–48 hours</b>.</p>
        <p><b>Service interest:</b> ${data.service}</p>
        <p style="margin-top:16px"><a href="${siteUrl}/payment">${siteUrl}/payment</a></p>
        <p style="margin-top:18px">Warm regards,<br/>GRWTEE</p>
      </div>
    `;
    const confirmResult = await sendEmail({
      to: data.email,
      subject: "We received your request — GRWTEE",
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


