import { CaptureWizard } from "@/components/CaptureWizard";
import { getRole } from "@/lib/auth";
import { isCaptureRole } from "@/lib/constants";
import { parseJsonArray } from "@/lib/http";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function CapturePage({ params }: { params: Promise<{ lesionId: string }> }) {
  const role = await getRole();
  if (!isCaptureRole(role)) redirect("/");
  const { lesionId } = await params;
  const { locale, t } = await getT();
  const lesion = await prisma.lesion.findUnique({
    where: { id: lesionId },
    include: { sessions: { include: { photos: true }, orderBy: { capturedAt: "desc" } } },
  });
  if (!lesion) notFound();
  const photos = lesion.sessions[0]?.photos ?? [];

  return (
    <div className="space-y-3">
      <p className="page-kicker">{t("capture.kicker")}</p>
      <h2 className="page-title">{t("capture.title")}</h2>
      <p className="text-sm text-muted">{t("capture.intro", { id: lesion.publicId })}</p>
      <CaptureWizard
        locale={locale}
        lesionId={lesion.id}
        existing={photos.map((photo) => ({
          view: photo.view,
          qcStatus: photo.qcStatus,
          qcReasons: parseJsonArray(photo.qcReasons),
        }))}
      />
    </div>
  );
}
