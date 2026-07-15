const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

type Signature = { mime: string; bytes: number[] };

const SIGNATURES: Signature[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }
];

function matchesSignature(buffer: Buffer, signature: Signature): boolean {
  if (buffer.length < signature.bytes.length) return false;
  return signature.bytes.every((byte, index) => buffer[index] === byte);
}

function detectMime(buffer: Buffer): string | null {
  for (const signature of SIGNATURES) {
    if (matchesSignature(buffer, signature)) {
      if (signature.mime === "image/webp") {
        return buffer.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : null;
      }
      return signature.mime;
    }
  }
  return null;
}

export type FileValidationResult =
  | { ok: true; mime: string; buffer: Buffer }
  | { ok: false; error: string };

export async function validateUploadFile(file: File): Promise<FileValidationResult> {
  if (file.size <= 0) {
    return { ok: false, error: "File is empty" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File exceeds 10 MB limit" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectMime(buffer);
  if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
    return { ok: false, error: "Unsupported file type" };
  }

  if (file.type && file.type !== detectedMime && file.type !== "image/jpg") {
    return { ok: false, error: "File type mismatch" };
  }

  return { ok: true, mime: detectedMime, buffer };
}

export { MAX_UPLOAD_BYTES, ALLOWED_MIME_TYPES };
