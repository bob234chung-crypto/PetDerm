import sharp from "sharp";
import { PHOTO_QC } from "@/lib/photo-protocol";

export type QcResult = {
  pass: boolean;
  reasons: string[];
};

export async function inspectImageQuality(buffer: Buffer, originalFilename: string): Promise<QcResult> {
  const reasons: string[] = [];
  const lower = originalFilename.toLowerCase();

  if (lower.startsWith("reject-") || lower.includes("reject-")) {
    reasons.push("qc.reject_demo");
  }

  try {
    const image = sharp(buffer);
    const meta = await image.metadata();
    const stats = await image.stats();

    if ((meta.width ?? 0) < PHOTO_QC.minWidth || (meta.height ?? 0) < PHOTO_QC.minHeight) {
      reasons.push("qc.low_res");
    }

    const channels = stats.channels ?? [];
    const mean =
      channels.reduce((sum, channel) => sum + channel.mean, 0) / Math.max(channels.length, 1);
    const stdev =
      channels.reduce((sum, channel) => sum + channel.stdev, 0) / Math.max(channels.length, 1);

    if (mean > PHOTO_QC.meanMax) {
      reasons.push("qc.overexposed");
    }
    if (mean < PHOTO_QC.meanMin) {
      reasons.push("qc.too_dark");
    }
    if (stdev < PHOTO_QC.stdevMin) {
      reasons.push("qc.blur_low_contrast");
    }
  } catch {
    reasons.push("qc.unreadable");
  }

  return { pass: reasons.length === 0, reasons };
}

export function sessionQcReasons(photoReasons: string[][], viewsPresent: string[]) {
  const reasons: string[] = [];
  const required = ["overview", "frontal", "oblique_1", "oblique_2"];
  for (const view of required) {
    if (!viewsPresent.includes(view)) {
      reasons.push(`qc.missing_${view}`);
    }
  }
  for (const list of photoReasons) {
    reasons.push(...list);
  }
  return Array.from(new Set(reasons));
}
