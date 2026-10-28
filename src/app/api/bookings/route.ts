import { enquirySchema, saveEnquiry, sendEnquiryEmails } from "@/lib/enquiries";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const revalidate = 300;

import { maskBookingListItem } from "@/lib/security/pii-mask";
import { parseEmail } from "@/lib/security/email-validation";
import { guardPublicForm, turnstileTokenOf } from "@/lib/security/public-form";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized } from "@/lib/security/api-response";
import { clampLimit } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return jsonUnauthorized();
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const full = searchParams.get("full") === "1";
    const limit = clampLimit(searchParams.get("limit"), 20, 200);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const data = await prisma.bookingRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit
    });
    const total = await prisma.bookingRequest.count({ where });
    return NextResponse.json({
      success: true,
      data: full ? data : data.map(maskBookingListItem),
      total
    });
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
  const parsed = enquirySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const emailResult = parseEmail(parsed.data.email);
  if (!emailResult.ok) {
    return NextResponse.json({ success: false, error: emailResult.message }, { status: 400 });
  }

  const refused = await guardPublicForm(req, {
    form: "booking",
    limit: 5,
    windowMs: 60 * 60_000,
    turnstileToken: turnstileTokenOf(json)
  });
  if (refused) return refused;

  const data = { ...parsed.data, email: emailResult.email };
  try {
    await saveEnquiry(data);
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

  // Notification to CONTACT_EMAIL (e.g. book@grwtee.com) and confirmation to the client via Resend.
  await sendEnquiryEmails("booking", data);

  return NextResponse.json({
    success: true,
    message: "Booking request submitted"
  });
}
