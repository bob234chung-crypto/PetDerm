import { getRole } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { inspectImageQuality } from "@/lib/qc";
import { storePhotoPair, validateImageFile, validateImageMeta } from "@/lib/privacy";
import { readObject } from "@/lib/storage";
import { cookies } from "next/headers";
import { PhotoView, QcStatus } from "@prisma/client";
import { PHOTO_VIEWS, isCaptureRole } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ lesionId: string }> };
const VIEWS = PHOTO_VIEWS.map((view) => view.id);

type BlobRef = {
  url?: string;
  pathname?: string;
  contentType?: string;
  originalFilename?: string;
  size?: number;
};

export async function POST(request: Request, ctx: Ctx) {
  try {
    return await savePhotos(request, ctx);
  } catch (error) {
    console.error("photo upload", error);
    return jsonError(error instanceof Error ? error.message : "上傳失敗", 500);
  }
}

async function savePhotos(request: Request, ctx: Ctx) {
  const role = await getRole();
  if (!isCaptureRole(role)) return jsonError("僅一般用戶或診所人員可上傳", 403);
  const consentId = (await cookies()).get("petderm-consent")?.value;
  if (!consentId) return jsonError("未有有效同意，不可上傳研究副本", 403);
  const consent = await prisma.consent.findUnique({ where: { id: consentId } });
  if (!consent || consent.status !== "active") return jsonError("同意無效", 403);

  const { lesionId } = await ctx.params;
  const lesion = await prisma.lesion.findUnique({
    where: { id: lesionId },
    include: { dog: true, sessions: { include: { photos: true }, orderBy: { capturedAt: "desc" } } },
  });
  if (!lesion) return jsonError("找不到病灶", 404);
  if (lesion.dog.consentId !== consentId) return jsonError("同意與個案不符", 403);

  let session = lesion.sessions[0];
  if (!session) {
    session = await prisma.photoSession.create({
      data: {
        lesionId,
        clinic: "unspecified",
        photographer: "unspecified",
        device: "unspecified",
        lighting: "unspecified",
      },
      include: { photos: true },
    });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const incoming: Array<{
    view: string;
    bytes: Buffer;
    mimeType: string;
    originalFilename: string;
    formatReasons: string[];
  }> = [];

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { blobs?: Record<string, BlobRef> };
    for (const view of VIEWS) {
      const ref = body.blobs?.[view];
      if (!ref?.url && !ref?.pathname) continue;
      const stored = ref.pathname ? `blob:${ref.pathname.replace(/^\//, "")}` : (ref.url as string);
      const bytes = await readObject(stored);
      const originalFilename = ref.originalFilename || `${view}.jpg`;
      incoming.push({
        view,
        bytes,
        mimeType: ref.contentType || "image/jpeg",
        originalFilename,
        formatReasons: validateImageMeta({
          type: ref.contentType,
          size: ref.size ?? bytes.length,
          name: originalFilename,
        }),
      });
    }
  } else {
    const form = await request.formData();
    for (const view of VIEWS) {
      const file = form.get(view);
      if (!(file instanceof File) || file.size === 0) continue;
      incoming.push({
        view,
        bytes: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type || "image/jpeg",
        originalFilename: file.name,
        formatReasons: validateImageFile(file),
      });
    }
  }

  for (const item of incoming) {
    const stored = await storePhotoPair({
      sessionId: session.id,
      view: item.view,
      bytes: item.bytes,
      mimeType: item.mimeType,
      originalFilename: item.originalFilename,
    });
    const quality = await inspectImageQuality(stored.researchBuffer, stored.originalFilename);
    const reasons = [...item.formatReasons, ...quality.reasons];
    const qcStatus = reasons.length ? "fail" : "pass";
    await prisma.photo.upsert({
      where: { sessionId_view: { sessionId: session.id, view: item.view as PhotoView } },
      update: {
        originalPath: stored.originalPath,
        researchPath: stored.researchPath,
        sha256: stored.sha256,
        mimeType: stored.mimeType,
        byteSize: stored.byteSize,
        originalFilename: stored.originalFilename,
        qcStatus: qcStatus as QcStatus,
        qcReasons: JSON.stringify(reasons),
      },
      create: {
        sessionId: session.id,
        view: item.view as PhotoView,
        originalPath: stored.originalPath,
        researchPath: stored.researchPath,
        sha256: stored.sha256,
        mimeType: stored.mimeType,
        byteSize: stored.byteSize,
        originalFilename: stored.originalFilename,
        qcStatus: qcStatus as QcStatus,
        qcReasons: JSON.stringify(reasons),
      },
    });
  }

  const photos = await prisma.photo.findMany({ where: { sessionId: session.id } });
  const hashes = photos.map((photo) => photo.sha256);
  const duplicate = hashes.length !== new Set(hashes).size;
  if (duplicate) {
    for (const photo of photos) {
      const reasons = JSON.parse(photo.qcReasons || "[]") as string[];
      if (!reasons.includes("qc.duplicate")) {
        reasons.push("qc.duplicate");
        await prisma.photo.update({
          where: { id: photo.id },
          data: { qcStatus: "fail", qcReasons: JSON.stringify(reasons) },
        });
      }
    }
  }

  const refreshed = await prisma.photo.findMany({ where: { sessionId: session.id } });
  const payload = refreshed.map((photo) => ({
    view: photo.view,
    qcStatus: photo.qcStatus,
    qcReasons: JSON.parse(photo.qcReasons || "[]") as string[],
  }));
  const missing = VIEWS.filter((view) => !refreshed.find((photo) => photo.view === view));
  const failReasons = payload.flatMap((photo) => photo.qcReasons);
  if (missing.length) failReasons.push(...missing.map((view) => `qc.missing_${view}`));
  const qcPassed = missing.length === 0 && refreshed.every((photo) => photo.qcStatus === "pass");

  return Response.json({
    qcPassed,
    reasons: Array.from(new Set(failReasons)),
    photos: payload,
  });
}
