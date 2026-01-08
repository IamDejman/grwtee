import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

/**
 * Public API endpoint to get public configuration values
 * Used by client components that need NEXT_PUBLIC_ vars from database
 */
export async function GET() {
  const siteUrl = await getConfig("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  const instagramUrl = await getConfig("NEXT_PUBLIC_INSTAGRAM_URL", process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/grwtee");
  const contactEmail = await getConfig("NEXT_PUBLIC_CONTACT_EMAIL", process.env.NEXT_PUBLIC_CONTACT_EMAIL || "grwteee@gmail.com");
  const cloudinaryCloudName = await getConfig("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

  return NextResponse.json({
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_INSTAGRAM_URL: instagramUrl,
    NEXT_PUBLIC_CONTACT_EMAIL: contactEmail,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: cloudinaryCloudName
  });
}

