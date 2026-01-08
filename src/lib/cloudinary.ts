import { v2 as cloudinary } from "cloudinary";
import { getConfig } from "./config";

// Initialize Cloudinary config dynamically from DB
let cloudinaryInitialized = false;

async function initCloudinary() {
  if (cloudinaryInitialized) return;
  
  const cloud_name = await getConfig("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
  const api_key = await getConfig("CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY);
  const api_secret = await getConfig("CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET);

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary credentials must be set in database (env_NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, env_CLOUDINARY_API_KEY, env_CLOUDINARY_API_SECRET) or environment variables");
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret
  });
  
  cloudinaryInitialized = true;
}

export async function deleteImage(publicId: string) {
  await initCloudinary();
  return await cloudinary.uploader.destroy(publicId);
}

export async function uploadImage(
  file: File,
  folder: string = "grwtee"
): Promise<{ secure_url: string; public_id: string }> {
  await initCloudinary();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "image",
          transformation: [
            { width: 1200, height: 1600, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" }
          ]
        },
        (error, result) => {
          if (error || !result) reject(error);
          else resolve(result as any);
        }
      )
      .end(buffer);
  });
}


