import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

const DEST = path.join(process.cwd(), "models", "imagenet-encoder.onnx");
const URLS = [
  "https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv2-12.onnx",
  "https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mobilenet/model/mobilenetv2-12.onnx",
];

async function main() {
  await mkdir(path.dirname(DEST), { recursive: true });
  let lastError: unknown;
  for (const url of URLS) {
    try {
      console.log("Downloading", url);
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      const size = Number(response.headers.get("content-length") ?? 0);
      if (size && size < 1_000_000) throw new Error(`file too small (${size})`);
      await pipeline(Readable.fromWeb(response.body as never), createWriteStream(DEST));
      console.log("Wrote", DEST);
      return;
    } catch (error) {
      lastError = error;
      console.warn("failed", error);
    }
  }
  throw lastError;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
