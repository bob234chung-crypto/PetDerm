import { MODEL_VERSION } from "@/lib/constants";

export type RoiBox = {
  view: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StubInput = {
  qcPassed: boolean;
  qcReasons: string[];
  physicalMatch: boolean;
  visibleRoi: boolean;
  rois: RoiBox[];
  inputHash: string;
};

export type StubOutput = {
  modelVersion: string;
  status: "needs_vet_review" | "cannot_assess";
  rejectReasons: string[];
  headline: string;
  explanation: string;
};

export function runStubTriage(input: StubInput): StubOutput {
  const rejectReasons: string[] = [];

  if (!input.qcPassed) {
    rejectReasons.push(...(input.qcReasons.length ? input.qcReasons : ["gate.failed"]));
  }
  if (!input.visibleRoi) {
    rejectReasons.push("gate.no_roi");
  }
  if (!input.physicalMatch) {
    rejectReasons.push("gate.mismatch");
  }
  if (input.visibleRoi && input.rois.length === 0) {
    rejectReasons.push("gate.no_box");
  }

  if (rejectReasons.length > 0) {
    return {
      modelVersion: MODEL_VERSION,
      status: "cannot_assess",
      rejectReasons,
      headline: rejectReasons[0] ?? "gate.failed",
      explanation: "triage.cannotExplain",
    };
  }

  return {
    modelVersion: MODEL_VERSION,
    status: "needs_vet_review",
    rejectReasons: [],
    headline: "triage.review",
    explanation: "triage.reviewExplain",
  };
}

export function mergeVisionRejects(
  gates: StubOutput,
  visionReasons: string[],
): StubOutput {
  if (gates.status === "cannot_assess") return gates;
  if (visionReasons.length === 0) return { ...gates, modelVersion: "photo-triage-v1" };
  return {
    modelVersion: "photo-triage-v1",
    status: "cannot_assess",
    rejectReasons: visionReasons,
    headline: visionReasons[0] ?? "gate.failed",
    explanation: "triage.cannotExplain",
  };
}

export function triageCopy(status: "needs_vet_review" | "cannot_assess", rejectReasons: string[]) {
  if (status === "cannot_assess") {
    const first = rejectReasons[0] ?? "輸入未能可靠評估";
    return {
      headline: `未能可靠評估：${first}。請重拍或由獸醫檢查；這不是低風險結果。`,
      tone: "neutral" as const,
    };
  }
  return {
    headline: "研究性：建議優先由獸醫評估／按既有計劃取樣",
    tone: "action" as const,
  };
}
