import { getRole } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const role = await getRole();
  const body = await request.json();
  if (!body.detail) return jsonError("請描述問題");
  const report = await prisma.incidentReport.create({
    data: {
      lesionId: body.lesionId || null,
      category: String(body.category ?? "other"),
      detail: String(body.detail),
      reporterRole: role,
    },
  });
  return Response.json({ id: report.id });
}
