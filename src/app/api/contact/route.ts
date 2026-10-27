import { enquirySchema, saveEnquiry, sendEnquiryEmails } from "@/lib/enquiries";
import { NextResponse } from "next/server";

import { parseEmail } from "@/lib/security/email-validation";
import { guardPublicForm, turnstileTokenOf } from "@/lib/security/public-form";

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
    form: "contact",
    limit: 5,
    windowMs: 60 * 60_000,
    turnstileToken: turnstileTokenOf(json)
  });
  if (refused) return refused;

  const data = { ...parsed.data, email: emailResult.email };
  try {
    await saveEnquiry(data);
  } catch (err) {
    console.error("[Contact] Save failed:", err);
    return NextResponse.json({ success: false, error: "Couldn't send your message. Try again." }, { status: 500 });
  }

  await sendEnquiryEmails("contact", data);

  return NextResponse.json({
    success: true,
    message: "Message sent successfully"
  });
}
