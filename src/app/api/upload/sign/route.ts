import { NextResponse } from "next/server";
import { z } from "zod";
import { GALLERY_FOLDERS, signGalleryUpload } from "@/lib/cloudinary";
import { jsonGenericServerError, jsonUnauthorized } from "@/lib/security/api-response";
import { safeError } from "@/lib/security/logger";
import { requireAdminSession } from "@/lib/security/session-auth";

const schema = z.object({ folder: z.enum(GALLERY_FOLDERS).default("grwtee") });

/**
 * POST /api/upload/sign { folder }
 * A signed upload for one gallery image, which the browser sends straight
 * to Cloudinary (WEB-21). Only the folders in GALLERY_FOLDERS.
 */
export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid folder" }, { status: 400 });
  }

  try {
    return NextResponse.json({ success: true, data: await signGalleryUpload(parsed.data.folder) });
  } catch (error) {
    safeError("[Upload] Signing failed", error);
    return jsonGenericServerError("upload-sign");
  }
}
