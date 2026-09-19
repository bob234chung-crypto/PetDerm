import { createHash } from "crypto";
import { existsSync } from "fs";
import path from "path";
import type { RoiBox } from "./stub";
import { roiToNchw } from "./preprocess";

export type ViewScore = {
  view: string;
  energy: number;
  maxSoftmax?: number;
};

export type VisionResult = {
  modelVersion: string;
  weightsHash: string;
  perViewScores: ViewScore[];
  minCosine: number;
  uncertainty: "low" | "medium" | "high";
  oodFlag: boolean;
  rejectReasons: string[];
};

const MODEL_CANDIDATES = [
  "models/photo-triage-v1.onnx",
  "models/imagenet-encoder.onnx",
];

let sessionPromise: Promise<import("onnxruntime-node").InferenceSession> | null = null;
let cachedPath = "";

export function modelFilePath() {
  for (const rel of MODEL_CANDIDATES) {
    const abs = path.join(process.cwd(), rel);
    if (existsSync(abs)) return abs;
  }
  return null;
}

async function getSession() {
  const abs = modelFilePath();
  if (!abs) {
    throw new Error("找不到 ONNX 權重。請先跑 npm run model:fetch 或 python ml/export_onnx.py");
  }
  if (sessionPromise && cachedPath === abs) return sessionPromise;
  cachedPath = abs;
  sessionPromise = import("onnxruntime-node").then((ort) =>
    ort.InferenceSession.create(abs, { executionProviders: ["cpu"] }),
  );
  return sessionPromise;
}

export async function weightsHash() {
  const abs = modelFilePath();
  if (!abs) return "missing";
  const { readFile } = await import("fs/promises");
  return createHash("sha256").update(await readFile(abs)).digest("hex").slice(0, 16);
}

export async function runVisionTriage(params: {
  photos: Array<{ view: string; buffer: Buffer }>;
  rois: RoiBox[];
}): Promise<VisionResult> {
  const ort = await import("onnxruntime-node");
  const session = await getSession();
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const vectors: number[][] = [];
  const perViewScores: ViewScore[] = [];

  for (const photo of params.photos) {
    const roi = params.rois.find((item) => item.view === photo.view);
    const nchw = await roiToNchw(photo.buffer, roi);
    const input = new ort.Tensor("float32", nchw, [1, 3, 224, 224]);
    const output = await session.run({ [inputName]: input });
    const data = Array.from(output[outputName].data as Float32Array);
    vectors.push(data);
    const energy = l2(data);
    perViewScores.push({
      view: photo.view,
      energy: round4(energy),
      maxSoftmax: looksLikeLogits(data) ? round4(maxSoftmax(data)) : undefined,
    });
  }

  const minCosine = minPairwiseCosine(vectors);
  const energies = perViewScores.map((item) => item.energy);
  const energySpread = (Math.max(...energies) - Math.min(...energies)) / Math.max(...energies, 1e-6);
  const rejectReasons: string[] = [];
  if (minCosine < 0.25) rejectReasons.push("vision.disagree");
  const oodFlag = energies.every((value) => value < 1e-3);
  if (oodFlag) rejectReasons.push("vision.ood");

  let uncertainty: VisionResult["uncertainty"] = "low";
  if (minCosine < 0.55 || energySpread > 0.45) uncertainty = "medium";
  if (minCosine < 0.35 || energySpread > 0.7) uncertainty = "high";

  return {
    modelVersion: "photo-triage-v1",
    weightsHash: await weightsHash(),
    perViewScores,
    minCosine: round4(minCosine),
    uncertainty,
    oodFlag,
    rejectReasons,
  };
}

function looksLikeLogits(data: number[]) {
  return data.length === 1000;
}

function maxSoftmax(logits: number[]) {
  const max = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  return Math.max(...exps.map((value) => value / sum));
}

function l2(values: number[]) {
  return Math.sqrt(values.reduce((acc, value) => acc + value * value, 0));
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function minPairwiseCosine(vectors: number[][]) {
  let min = 1;
  for (let i = 0; i < vectors.length; i += 1) {
    for (let j = i + 1; j < vectors.length; j += 1) {
      min = Math.min(min, cosine(vectors[i], vectors[j]));
    }
  }
  return min;
}

function round4(value: number) {
  return Math.round(value * 10000) / 10000;
}
