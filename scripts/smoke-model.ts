import { readFile } from "fs/promises";
import path from "path";
import { runVisionTriage } from "../lib/inference/onnx";

async function main() {
  const views = ["overview", "frontal", "oblique_1", "oblique_2"] as const;
  const photos = [];
  for (const view of views) {
    const buffer = await readFile(path.join(process.cwd(), "public", "demo", `${view}.jpg`));
    photos.push({ view, buffer });
  }
  const result = await runVisionTriage({
    photos,
    rois: views.map((view) => ({ view, x: 0.25, y: 0.25, width: 0.5, height: 0.5 })),
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
