import { randomBytes } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { getConfig } from "./config";

// Cloudinary holds the website's own gallery. App content (looks and
// lookbooks, including the ones made in the dashboard) is in Supabase
// storage (ARCH-05).

/** The folders gallery uploads may go to (WEB-21). */
export const GALLERY_FOLDERS = ["grwtee"] as const;

// The same limits the server applied when uploads went through it.
const INCOMING_TRANSFORMATION = "c_limit,h_1600,w_1200/q_auto";
const ALLOWED_FORMATS = "jpg,jpeg,png,webp,heic,heif,avif";

async function credentials() {
  const cloud_name = await getConfig("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
  const api_key = await getConfig("CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY);
  const api_secret = await getConfig("CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET);

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary credentials must be set in database (env_NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, env_CLOUDINARY_API_KEY, env_CLOUDINARY_API_SECRET) or environment variables");
  }
  return { cloud_name, api_key, api_secret };
}

// Initialize Cloudinary config dynamically from DB
let cloudinaryInitialized = false;

async function initCloudinary() {
  if (cloudinaryInitialized) return;
  cloudinary.config(await credentials());
  cloudinaryInitialized = true;
}

/**
 * What the browser needs to upload a gallery image straight to Cloudinary
 * (WEB-21): uploads through the site were capped by Vercel's 4.5 MB request
 * limit. The signature fixes the folder, file name, formats and resizing,
 * so the browser can't change them.
 */
export async function signGalleryUpload(folder: (typeof GALLERY_FOLDERS)[number]) {
  const { cloud_name, api_key, api_secret } = await credentials();
  const params: Record<string, string | number> = {
    allowed_formats: ALLOWED_FORMATS,
    folder,
    public_id: randomBytes(16).toString("hex"),
    timestamp: Math.round(Date.now() / 1000),
    transformation: INCOMING_TRANSFORMATION,
    ...(process.env.CLOUDINARY_MODERATION === "true" ? { moderation: "aws_rek" } : {})
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud_name)}/image/upload`,
    fields: { ...params, api_key, signature: cloudinary.utils.api_sign_request(params, api_secret) }
  };
}

/** Whether a gallery image's address and id are an upload to our own cloud and folders. */
export async function isOwnGalleryUpload(imageUrl: string, cloudinaryId: string): Promise<boolean> {
  const cloudName = await getConfig("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
  if (!cloudName) return false;
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.hostname === "res.cloudinary.com" &&
    url.pathname.startsWith(`/${cloudName}/image/upload/`) &&
    GALLERY_FOLDERS.some((folder) => cloudinaryId.startsWith(`${folder}/`)) &&
    url.pathname.includes(cloudinaryId)
  );
}

export async function deleteImage(publicId: string) {
  await initCloudinary();
  return await cloudinary.uploader.destroy(publicId);
}
