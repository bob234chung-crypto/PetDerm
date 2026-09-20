import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getRole } from "@/lib/auth";
import { isCaptureRole } from "@/lib/constants";
import { publicCaseId } from "@/lib/privacy";
import { jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const role = await getRole();
  if (!isCaptureRole(role)) return jsonError("僅一般用戶或診所人員可建立個案", 403);
  const consentId = (await cookies()).get("petderm-consent")?.value;
  if (!consentId) return jsonError("未有有效同意，不可建立研究個案", 403);
  const consent = await prisma.consent.findUnique({ where: { id: consentId } });
  if (!consent || consent.status !== "active") return jsonError("同意已撤回或無效", 403);

  const body = await request.json();
  const breed = resolveBreed(body);
  const dog = await prisma.dog.create({
    data: {
      publicId: publicCaseId("DOG"),
      consentId,
      ageYears: body.ageYears,
      breed,
      mixedBreed: Boolean(body.mixedBreed) || breed === "mixed",
      sex: body.sex ?? "unknown",
      neutered: body.neutered,
      weightKg: body.weightKg,
      coatColor: String(body.coatColor ?? "不確定"),
      coatLength: String(body.coatLength ?? "不確定"),
    },
  });
  const lesion = await prisma.lesion.create({
    data: {
      publicId: publicCaseId("LSN"),
      dogId: dog.id,
      site: String(body.site ?? "其他"),
      laterality: body.laterality ?? "unknown",
      sizeLengthMm: body.sizeLengthMm,
      sizeWidthMm: body.sizeWidthMm,
      sizeHeightMm: body.sizeHeightMm,
      durationText: body.durationText,
      changeText: body.changeText,
      ulceration: body.ulceration,
      pruritus: body.pruritus,
      priorMctHistory: body.priorMctHistory,
    },
  });
  await prisma.photoSession.create({
    data: {
      lesionId: lesion.id,
      clinic: String(body.clinic ?? "unspecified"),
      photographer: String(body.photographer ?? "unspecified"),
      device: String(body.device ?? "unspecified"),
      lighting: String(body.lighting ?? "unspecified"),
    },
  });

  return Response.json({ dogId: dog.id, lesionId: lesion.id, dogPublicId: dog.publicId, lesionPublicId: lesion.publicId });
}

export async function GET() {
  const role = await getRole();
  if (isCaptureRole(role)) {
    const consentId = (await cookies()).get("petderm-consent")?.value;
    const lesions = await prisma.lesion.findMany({
      where: consentId ? { dog: { consentId } } : undefined,
      include: { dog: true, sessions: { include: { photos: true, inferences: true } } },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({
      lesions: lesions.map((lesion) => ({
        id: lesion.id,
        publicId: lesion.publicId,
        site: lesion.site,
        dogPublicId: lesion.dog.publicId,
        photoCount: lesion.sessions[0]?.photos.length ?? 0,
        inference: lesion.sessions[0]?.inferences[0]
          ? {
              id: lesion.sessions[0].inferences[0].id,
              status: lesion.sessions[0].inferences[0].status,
              createdAt: lesion.sessions[0].inferences[0].createdAt,
            }
          : null,
      })),
    });
  }
  return jsonError("請使用對應角色頁面", 403);
}

function resolveBreed(body: { breed?: unknown; breedOther?: unknown }) {
  const raw = String(body.breed ?? "").trim();
  if (raw === "other") {
    return String(body.breedOther ?? "").trim() || "other";
  }
  return raw || "未填";
}
