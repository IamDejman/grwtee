import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/security/session-auth";
import { jsonUnauthorized, jsonGenericServerError } from "@/lib/security/api-response";
import { createSignedAccessToken, buildSignedUrl } from "@/lib/security/signed-access";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return jsonUnauthorized();
  }

  const { id } = await params;
  try {
    const { token, exp } = createSignedAccessToken({
      resource: "invoice-pdf",
      id,
      ttlSeconds: 300
    });
    const path = `/api/invoices/${id}/pdf`;
    return NextResponse.json({
      success: true,
      data: {
        url: buildSignedUrl(path, token, exp),
        expiresAt: new Date(exp * 1000).toISOString()
      }
    });
  } catch {
    return jsonGenericServerError("invoice-pdf-link");
  }
}
