import { createHash, randomBytes } from "crypto";
import path from "path";
import sharp from "sharp";
import { PHOTO_QC } from "@/lib/photo-protocol";
import { putObject } from "@/lib/storage";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function publicCaseId(prefix: string) {
  return `${prefix}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function validateImageMeta(input: { type?: string; size: number; name: string }) {
  const reasons: string[] = [];
  if (!ALLOWED_TYPES.has(input.type ?? "") && !input.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
    reasons.push("qc.bad_format");
  }
  if (input.size > PHOTO_QC.maxFileBytes) {
    reasons.push("qc.too_large");
  }
  if (input.size < PHOTO_QC.minFileBytes) {
    reasons.push("qc.too_small_file");
  }
  return reasons;
}

export function validateImageFile(file: File) {
  return validateImageMeta({ type: file.type, size: file.size, name: file.name });
}

export async function storePhotoPair(params: {
  sessionId: string;
  view: string;
  bytes: Buffer;
  mimeType: string;
  originalFilename: string;
}) {
  const hash = sha256(params.bytes);
  const ext = extensionFor(params.originalFilename, params.mimeType);
  const originalKey = `uploads/original/${params.sessionId}-${params.view}${ext}`;
  const researchKey = `uploads/research/${params.sessionId}-${params.view}.jpg`;

  let stripped: Buffer;
  try {
    stripped = await sharp(params.bytes)
      .rotate()
      .jpeg({ quality: PHOTO_QC.researchJpegQuality, mozjpeg: true })
      .toBuffer();
  } catch {
    stripped = params.bytes;
  }

  const originalPath = await putObject(originalKey, params.bytes, params.mimeType || "application/octet-stream");
  const researchPath = await putObject(researchKey, stripped, "image/jpeg");

  return {
    originalPath,
    researchPath,
    researchBuffer: stripped,
    sha256: hash,
    mimeType: params.mimeType || "application/octet-stream",
    byteSize: params.bytes.length,
    originalFilename: params.originalFilename,
  };
}

function extensionFor(filename: string, mimeType: string) {
  const fromName = path.extname(filename).toLowerCase();
  if (fromName) return fromName;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}
