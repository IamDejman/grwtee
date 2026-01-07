import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    const to = process.env.CONTACT_EMAIL || "grwteee@gmail.com";
    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://grwtee.com";
    const subject = "New Contact / Booking Request";

    await transporter.sendMail({
      from: `GRWTEE <${process.env.SMTP_USER}>`,
      to,
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
          <p style="color:#555">View in admin: <a href="${site}/admin/bookings">${site}/admin/bookings</a></p>
        </div>
      `
    });

    // Confirmation email to client
    await transporter.sendMail({
      from: `GRWTEE <${process.env.SMTP_USER}>`,
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
        `${site}/payment`,
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
          <p><a href="${site}/payment">${site}/payment</a></p>
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


