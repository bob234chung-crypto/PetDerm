import { createHash } from "crypto";
import { getRole } from "@/lib/auth";
import { captureOwnsConsent } from "@/lib/access";
import { MODEL_VERSION, isCaptureRole } from "@/lib/constants";
import { jsonError } from "@/lib/http";
import { mergeVisionRejects, runStubTriage, type RoiBox } from "@/lib/inference/stub";
import { modelFilePath, runVisionTriage } from "@/lib/inference/onnx";
import { prisma } from "@/lib/prisma";
import { readObject } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ lesionId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const role = await getRole();
  if (!isCaptureRole(role)) return jsonError("僅一般用戶或診所人員可要求分流", 403);
  const { lesionId } = await ctx.params;
  const body = await request.json();
  const lesion = await prisma.lesion.findUnique({
    where: { id: lesionId },
    include: {
      dog: true,
      sessions: { include: { photos: true }, orderBy: { capturedAt: "desc" } },
    },
  });
  if (!lesion) return jsonError("找不到病灶", 404);
  if (!(await captureOwnsConsent(lesion.dog.consentId))) {
    return jsonError("未授權存取此個案", 403);
  }
  const session = lesion.sessions[0];
  if (!session) return jsonError("尚未拍攝", 400);

  const photos = session.photos;
  const required = ["overview", "frontal", "oblique_1", "oblique_2"] as const;
  const missing = required.filter((view) => !photos.find((photo) => photo.view === view));
  const qcReasons = [
    ...missing.map((view) => `qc.missing_${view}`),
    ...photos.flatMap((photo) => JSON.parse(photo.qcReasons || "[]") as string[]),
  ];
  const qcPassed = missing.length === 0 && photos.every((photo) => photo.qcStatus === "pass");
  if (!qcPassed) {
    return Response.json(
      { error: "品質閘門未通過，請重拍。不可跳過後直接推論。", redirectToCapture: true, reasons: qcReasons },
      { status: 400 },
    );
  }

  const rois = Array.isArray(body.rois) ? (body.rois as RoiBox[]) : [];
  const physicalMatch = Boolean(body.physicalMatch);
  const visibleRoi = Boolean(body.visibleRoi);
  const inputHash = createHash("sha256")
    .update(photos.map((photo) => photo.sha256).sort().join("|"))
    .update(JSON.stringify(rois))
    .digest("hex");

  const gates = runStubTriage({
    qcPassed,
    qcReasons,
    physicalMatch,
    visibleRoi,
    rois: visibleRoi ? rois : [],
    inputHash,
  });

  let result = { ...gates, modelVersion: MODEL_VERSION };
  let perViewScores = "[]";
  let uncertainty = "";
  let oodFlag = false;
  let fileHash = "";

  if (gates.status !== "cannot_assess") {
    try {
      if (!modelFilePath()) {
        throw new Error("model missing");
      }
      const ordered = [];
      for (const view of required) {
        const photo = photos.find((item) => item.view === view);
        if (!photo) continue;
        const buffer = await readObject(photo.researchPath);
        ordered.push({ view, buffer });
      }
      const vision = await runVisionTriage({ photos: ordered, rois });
      result = mergeVisionRejects(result, vision.rejectReasons);
      perViewScores = JSON.stringify(vision.perViewScores);
      uncertainty = vision.uncertainty;
      oodFlag = vision.oodFlag;
      fileHash = vision.weightsHash;
    } catch (error) {
      console.warn("vision triage fallback to stub", error);
    }
  }

  const run = await prisma.inferenceRun.create({
    data: {
      sessionId: session.id,
      modelVersion: MODEL_VERSION,
      status: result.status,
      rejectReasons: JSON.stringify(result.rejectReasons),
      qcPassed,
      roiJson: JSON.stringify(rois),
      inputHash,
      physicalMatch,
      visibleRoi,
      perViewScores,
      uncertainty,
      oodFlag,
      weightsHash: fileHash,
    },
  });

  return Response.json({
    id: run.id,
    status: result.status,
    headline: result.headline,
    explanation: result.explanation,
    rejectReasons: result.rejectReasons,
    modelVersion: MODEL_VERSION,
    perViewScores: JSON.parse(perViewScores),
    uncertainty,
    oodFlag,
    weightsHash: fileHash,
    createdAt: run.createdAt,
  });
}
