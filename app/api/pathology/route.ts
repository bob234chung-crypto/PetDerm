import { getRole } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const role = await getRole();
  if (role !== "reviewer") return jsonError("僅覆核角色可讀病理", 403);
  const records = await prisma.pathologyRecord.findMany({
    include: { lesion: { include: { dog: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json({ records });
}

export async function POST(request: Request) {
  const role = await getRole();
  if (role !== "reviewer") return jsonError("僅覆核角色可寫病理", 403);
  const body = await request.json();
  if (!body.lesionId) return jsonError("缺少 lesionId");
  const record = await prisma.pathologyRecord.upsert({
    where: { lesionId: body.lesionId },
    update: {
      sampledAt: body.sampledAt ? new Date(body.sampledAt) : null,
      sampleType: body.sampleType,
      labName: body.labName,
      reportSummary: body.reportSummary,
      tumorType: body.tumorType,
      malignancyLabel: body.malignancyLabel ?? "uncertain",
      certainty: body.certainty ?? "uncertain",
      reviewerName: body.reviewerName ?? "reviewer",
    },
    create: {
      lesionId: body.lesionId,
      sampledAt: body.sampledAt ? new Date(body.sampledAt) : null,
      sampleType: body.sampleType,
      labName: body.labName,
      reportSummary: body.reportSummary,
      tumorType: body.tumorType,
      malignancyLabel: body.malignancyLabel ?? "uncertain",
      certainty: body.certainty ?? "uncertain",
      reviewerName: body.reviewerName ?? "reviewer",
    },
  });
  return Response.json({
    record: {
      sampleType: record.sampleType,
      labName: record.labName,
      reportSummary: record.reportSummary,
      tumorType: record.tumorType,
      malignancyLabel: record.malignancyLabel,
      certainty: record.certainty,
      reviewerName: record.reviewerName,
      sampledAt: record.sampledAt?.toISOString() ?? null,
    },
  });
}
