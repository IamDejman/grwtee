import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import nodemailer from "nodemailer";

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

  // Send notification email
  try {
    const smtpHost = await getConfig("SMTP_HOST", process.env.SMTP_HOST);
    const smtpPort = Number(await getConfig("SMTP_PORT", process.env.SMTP_PORT || "587"));
    const smtpUser = await getConfig("SMTP_USER", process.env.SMTP_USER);
    const smtpPassword = await getConfig("SMTP_PASSWORD", process.env.SMTP_PASSWORD);
    const contactEmail = await getConfig("CONTACT_EMAIL", process.env.CONTACT_EMAIL || "book@grwtee.com");
    const siteUrl = await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL || "https://grwtee.com");

    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error("SMTP configuration must be set in database or environment variables");
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });
    const subject = "New Contact / Booking Request";

    await transporter.sendMail({
      from: `GRWTEE <${smtpUser}>`,
      to: contactEmail,
      subject,
      text: [
        "New booking request received:",
        "",
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Phone: ${data.phone}`,
        `Service: ${data.service}`,
        "",
        "Message:",
        data.message
      ].join("\n"),
      html: `
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
      `
    });

    // Confirmation email to client
    await transporter.sendMail({
      from: `GRWTEE <${smtpUser}>`,
      to: data.email,
      subject: "We received your message — GRWTEE",
      text: [
        `Hi ${data.name},`,
        "",
        "Thank you for reaching out to GRWTEE.",
        "We’ve received your message and will get back to you within 24–48 hours.",
        "",
        `Service interest: ${data.service}`,
        "",
        "In the meantime, you can review our policies here:",
        `${siteUrl}/payment`,
        "",
        "Warm regards,",
        "GRWTEE"
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <p>Hi ${data.name},</p>
          <p>Thank you for reaching out to <b>GRWTEE</b>. We’ve received your message and will get back to you within <b>24–48 hours</b>.</p>
          <p><b>Service interest:</b> ${data.service}</p>
          <p style="margin-top:16px">In the meantime, you can review our policies here:</p>
          <p><a href="${siteUrl}/payment">${siteUrl}/payment</a></p>
          <p style="margin-top:18px">Warm regards,<br/>GRWTEE</p>
        </div>
      `
    });
  } catch (e) {
    // Do not fail request if email fails
    console.error("Email send failed", e);
  }

  return NextResponse.json({
    success: true,
    message: "Message sent successfully"
  });
}


