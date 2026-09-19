import { ReportForm } from "@/components/ReportForm";
import { TriageResult } from "@/components/TriageResult";
import { getRole } from "@/lib/auth";
import { isCaptureRole } from "@/lib/constants";
import { parseJsonArray } from "@/lib/http";
import { formatTriage } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function ResultPage({ params }: { params: Promise<{ lesionId: string }> }) {
  const role = await getRole();
  if (!isCaptureRole(role)) redirect("/");
  const { lesionId } = await params;
  const { locale, t } = await getT();
  const lesion = await prisma.lesion.findUnique({
    where: { id: lesionId },
    include: {
      sessions: { include: { inferences: { orderBy: { createdAt: "desc" } } }, orderBy: { capturedAt: "desc" } },
    },
  });
  if (!lesion) notFound();
  const inference = lesion.sessions[0]?.inferences[0];
  if (!inference) redirect(`/case/${lesionId}/confirm`);
  const reasons = parseJsonArray(inference.rejectReasons);
  const copy = formatTriage(locale, inference.status, reasons);

  return (
    <div className="space-y-4">
      <p className="page-kicker">{t("result.kicker")}</p>
      <h2 className="page-title">{t("result.title")}</h2>
      <TriageResult
        locale={locale}
        status={inference.status}
        headline={copy.headline}
        explanation={copy.explanation}
        rejectReasons={reasons}
        createdAt={inference.createdAt.toISOString()}
        auditId={inference.id}
        perViewScores={safeJson(inference.perViewScores)}
        uncertainty={inference.uncertainty}
        oodFlag={inference.oodFlag}
        weightsHash={inference.weightsHash}
      />
      <Link href={`/case/${lesionId}/detail`} className="block text-center text-sm font-bold text-terra">
        {t("result.details")}
      </Link>
      <ReportForm lesionId={lesion.id} locale={locale} />
    </div>
  );
}

function safeJson(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
