import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAdminLogin, type AdminLoginError } from "@/lib/auth";
import { requestMeta } from "@/lib/security/audit-log";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().optional()
});

const ERROR_MESSAGES: Record<AdminLoginError, string> = {
  invalid_credentials: "Invalid email or password",
  mfa_required: "Enter the 6-digit code from your authenticator app",
  mfa_invalid: "Invalid authenticator code",
  account_locked: "Account temporarily locked. Try again later.",
  rate_limited: "Too many attempts. Try again in a few minutes."
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 400 });
  }

  const meta = requestMeta(req);
  const result = await validateAdminLogin(parsed.data, {
    headers: {
      "x-forwarded-for": meta.ip ?? undefined,
      "user-agent": meta.userAgent ?? undefined
    }
  });

  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    {
      ok: false,
      error: result.error,
      message: ERROR_MESSAGES[result.error]
    },
    { status: 401 }
  );
}
