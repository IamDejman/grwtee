import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { validateUploadFile } from "@/lib/security/file-validation";
import { jsonGenericServerError, jsonUnauthorized } from "@/lib/security/api-response";
import { safeError } from "@/lib/security/logger";

export async function POST(req: Request) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return jsonUnauthorized();
  }

  const form = await req.formData();
  const file = form.get("file");
  const folder = (form.get("folder") as string) || "grwtee";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
  }

  const validation = await validateUploadFile(file);
  if (!validation.ok) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  try {
    const secureName = randomBytes(16).toString("hex");
    const uploaded = await uploadImage(validation.buffer, folder, secureName);
    return NextResponse.json({
      success: true,
      data: { imageUrl: uploaded.secure_url, cloudinaryId: uploaded.public_id }
    });
  } catch (error) {
    safeError("[Upload] Failed", error);
    return jsonGenericServerError("upload");
  }
}
