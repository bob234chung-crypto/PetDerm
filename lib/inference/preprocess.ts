import sharp from "sharp";
import type { RoiBox } from "./stub";

const SIZE = 224;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export async function roiToNchw(buffer: Buffer, roi?: RoiBox) {
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? SIZE;
  const height = meta.height ?? SIZE;

  let pipeline = image;
  if (roi && roi.width > 0.02 && roi.height > 0.02) {
    const left = clamp(Math.round(roi.x * width), 0, width - 2);
    const top = clamp(Math.round(roi.y * height), 0, height - 2);
    const cropW = clamp(Math.round(roi.width * width), 2, width - left);
    const cropH = clamp(Math.round(roi.height * height), 2, height - top);
    pipeline = image.extract({ left, top, width: cropW, height: cropH });
  }

  const raw = await pipeline.resize(SIZE, SIZE, { fit: "cover" }).removeAlpha().raw().toBuffer();
  const tensor = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      const value = raw[i * 3 + c] / 255;
      tensor[c * SIZE * SIZE + i] = (value - MEAN[c]) / STD[c];
    }
  }
  return tensor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
