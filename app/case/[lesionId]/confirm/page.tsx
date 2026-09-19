import { ConfirmClient } from "@/components/ConfirmClient";
import { getRole } from "@/lib/auth";
import { isCaptureRole } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function ConfirmPage({ params }: { params: Promise<{ lesionId: string }> }) {
  const role = await getRole();
  if (!isCaptureRole(role)) redirect("/");
  const { lesionId } = await params;
  const { locale, t } = await getT();
  const lesion = await prisma.lesion.findUnique({
    where: { id: lesionId },
    include: { sessions: { include: { photos: true }, orderBy: { capturedAt: "desc" } } },
  });
  if (!lesion) notFound();
  const session = lesion.sessions[0];
  if (!session || session.photos.length < 4) redirect(`/case/${lesionId}/capture`);
  if (session.photos.some((photo) => photo.qcStatus !== "pass")) {
    redirect(`/case/${lesionId}/capture`);
  }

  return (
    <div className="space-y-3">
      <p className="page-kicker">{t("confirm.kicker")}</p>
      <h2 className="page-title">{t("confirm.title")}</h2>
      <p className="text-sm text-muted">{t("confirm.intro", { id: lesion.publicId })}</p>
      <ConfirmClient
        locale={locale}
        lesionId={lesion.id}
        photos={session.photos.map((photo) => ({ id: photo.id, view: photo.view }))}
      />
    </div>
  );
}
