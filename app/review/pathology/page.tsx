import { PathologyReview } from "@/components/PathologyReview";
import { getRole } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function PathologyPage() {
  const role = await getRole();
  if (role !== "reviewer") redirect("/");
  const { locale, t } = await getT();

  const lesions = await prisma.lesion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      dog: true,
      pathology: true,
      sessions: { include: { inferences: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="page-title">{t("pathology.title")}</h2>
      <p className="text-sm text-muted">{t("pathology.intro")}</p>
      <PathologyReview
        locale={locale}
        rows={lesions.map((lesion) => ({
          lesionId: lesion.id,
          publicId: lesion.publicId,
          dogPublicId: lesion.dog.publicId,
          site: lesion.site,
          inferred: lesion.sessions[0]?.inferences[0]?.status ?? null,
          pathology: lesion.pathology
            ? {
                sampleType: lesion.pathology.sampleType,
                labName: lesion.pathology.labName,
                reportSummary: lesion.pathology.reportSummary,
                tumorType: lesion.pathology.tumorType,
                malignancyLabel: lesion.pathology.malignancyLabel,
                certainty: lesion.pathology.certainty,
                reviewerName: lesion.pathology.reviewerName,
                sampledAt: lesion.pathology.sampledAt?.toISOString() ?? null,
              }
            : null,
        }))}
      />
    </div>
  );
}
