/** Capture and analysis protocol. There is no per-brand color matrix. */

export const PHOTO_QC = {
  minWidth: 400,
  minHeight: 400,
  meanMin: 18,
  meanMax: 245,
  stdevMin: 8,
  minFileBytes: 8 * 1024,
  maxFileBytes: 12 * 1024 * 1024,
  researchJpegQuality: 90,
} as const;

/** ImageNet MobileNetV2 input. Same for every phone. */
export const MODEL_INPUT = {
  size: 224,
  mean: [0.485, 0.456, 0.406] as const,
  std: [0.229, 0.224, 0.225] as const,
};

export const VISION_GATES = {
  minCosineReject: 0.25,
  cosineMedium: 0.55,
  cosineHighUncertainty: 0.35,
  energySpreadMedium: 0.45,
  energySpreadHigh: 0.7,
} as const;

export const RECOMMENDED_LIGHTING = "indoor_daylight" as const;
export const ACCEPTABLE_LIGHTING = ["indoor_daylight", "outdoor_overcast"] as const;
