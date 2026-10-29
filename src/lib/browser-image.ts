/**
 * Photos are made smaller in the browser before they're uploaded: at most
 * 1600 px on the longer side, saved again as JPEG, which also drops EXIF
 * data such as where the photo was taken. Formats the browser can't draw
 * (some HEIC files) go up as they are.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.85;

export async function shrinkImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function" || !file.type.startsWith("image/")) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  return blob ?? file;
}
