import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(req: Request) {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const folder = (form.get("folder") as string) || "grwtee";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
  }

  const uploaded = await uploadImage(file, folder);
  return NextResponse.json({
    success: true,
    data: { imageUrl: uploaded.secure_url, cloudinaryId: uploaded.public_id }
  });
}


