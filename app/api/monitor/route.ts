import { getRole } from "@/lib/auth";
import { jsonError, parseJsonArray } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const role = await getRole();
  if (role !== "monitor") return jsonError("僅監察角色可讀彙總", 403);

  const [dogs, lesions, photos, inferences, pathology, reports, sessions] = await Promise.all([
    prisma.dog.count(),
    prisma.lesion.count(),
    prisma.photo.groupBy({ by: ["qcStatus"], _count: true }),
    prisma.inferenceRun.findMany({ select: { status: true, rejectReasons: true } }),
    prisma.pathologyRecord.groupBy({ by: ["malignancyLabel"], _count: true }),
    prisma.incidentReport.count(),
    prisma.photoSession.groupBy({ by: ["device"], _count: true }),
  ]);

  return Response.json({
    dogs,
    lesions,
    qc: photos,
    inferences: {
      needs_vet_review: inferences.filter((item) => item.status === "needs_vet_review").length,
      cannot_assess: inferences.filter((item) => item.status === "cannot_assess").length,
      rejectReasons: inferences.flatMap((item) => parseJsonArray(item.rejectReasons)),
    },
    pathology,
    reports,
    devices: sessions,
  });
}
