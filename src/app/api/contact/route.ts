import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
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
    await sendEmail({
      to: contactEmail,
      subject: "New Contact / Booking Request",
      html: notificationHtml,
      text: notificationText
    });

    const confirmationText = [
      `Hi ${data.name},`,
      "",
      "Thank you for reaching out to GRWTEE. We've received your message and will get back to you within 24–48 hours.",
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
        <p>Thank you for reaching out to <b>GRWTEE</b>. We've received your message and will get back to you within <b>24–48 hours</b>.</p>
        <p><b>Service interest:</b> ${data.service}</p>
        <p style="margin-top:16px"><a href="${siteUrl}/payment">${siteUrl}/payment</a></p>
        <p style="margin-top:18px">Warm regards,<br/>GRWTEE</p>
      </div>
    `;
    await sendEmail({
      to: data.email,
      subject: "We received your message — GRWTEE",
      html: confirmationHtml,
      text: confirmationText
    });
  } catch (e) {
    console.error("Email send failed", e);
  }

  return NextResponse.json({
    success: true,
    message: "Message sent successfully"
  });
}
