import { getRole } from "@/lib/auth";
import { captureOwnsConsent } from "@/lib/access";
import { jsonError, parseJsonArray } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { isCaptureRole } from "@/lib/constants";

type Ctx = { params: Promise<{ lesionId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const role = await getRole();
  const { lesionId } = await ctx.params;
  const lesion = await prisma.lesion.findUnique({
    where: { id: lesionId },
    include: {
      dog: true,
      pathology: role === "reviewer",
      sessions: { include: { photos: true, inferences: { orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!lesion) return jsonError("找不到病灶", 404);
  if (!(await captureOwnsConsent(lesion.dog.consentId))) {
    return jsonError("未授權存取此個案", 403);
  }

  const session = lesion.sessions[0];
  const inference = session?.inferences[0];
  const clinicPayload = {
    lesionId: lesion.id,
    publicId: lesion.publicId,
    site: lesion.site,
    laterality: lesion.laterality,
    dog: {
      publicId: lesion.dog.publicId,
      ageYears: lesion.dog.ageYears,
      breed: lesion.dog.breed,
      sex: lesion.dog.sex,
      coatColor: lesion.dog.coatColor,
      coatLength: lesion.dog.coatLength,
    },
    photos: (session?.photos ?? []).map((photo) => ({
      id: photo.id,
      view: photo.view,
      qcStatus: photo.qcStatus,
      qcReasons: parseJsonArray(photo.qcReasons),
    })),
    inference: inference
      ? {
          id: inference.id,
          status: inference.status,
          rejectReasons: parseJsonArray(inference.rejectReasons),
          modelVersion: inference.modelVersion,
          createdAt: inference.createdAt,
          qcPassed: inference.qcPassed,
        }
      : null,
  };

  if (isCaptureRole(role) || role === "monitor") {
    return Response.json(clinicPayload);
  }
  if (role === "reviewer") {
    return Response.json({
      ...clinicPayload,
      pathology: lesion.pathology,
    });
  }
  return jsonError("未授權", 403);
}
