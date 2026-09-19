import { Disclaimer } from "@/components/Disclaimer";
import { ReportForm } from "@/components/ReportForm";
import { getRole } from "@/lib/auth";
import { MODEL_VERSION, isCaptureRole } from "@/lib/constants";
import { fieldLabel } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function DetailPage({ params }: { params: Promise<{ lesionId: string }> }) {
  const role = await getRole();
  if (!isCaptureRole(role)) redirect("/");
  const { lesionId } = await params;
  const { locale, t } = await getT();
  const lesion = await prisma.lesion.findUnique({
    where: { id: lesionId },
    include: { dog: true, sessions: { include: { inferences: true, photos: true } } },
  });
  if (!lesion) notFound();

  return (
    <div className="space-y-4">
      <p className="page-kicker">{t("detail.kicker")}</p>
      <h2 className="page-title">{t("detail.title")}</h2>
      <Disclaimer locale={locale} extra={t("detail.extra")} />
      <section className="card space-y-2 text-sm leading-relaxed">
        <h2 className="font-extrabold">{t("detail.title")}</h2>
        <p>
          <strong>{t("detail.target")}</strong>
          {t("detail.targetBody")}
        </p>
        <p>
          <strong>{t("detail.ref")}</strong>
          {t("detail.refBody")}
        </p>
        <p>
          <strong>{t("detail.scope")}</strong>
          {t("detail.scopeBody")}
        </p>
        <p>
          <strong>{t("detail.model")}</strong>
          {t("detail.modelBody", { version: MODEL_VERSION })}
        </p>
        <p>
          <strong>{t("detail.valid")}</strong>
          {t("detail.validBody")}
        </p>
        <p>
          <strong>{t("detail.cal")}</strong>
          {t("detail.calBody")}
        </p>
        <p>
          <strong>{t("detail.ids")}</strong>
          {lesion.dog.publicId} / {lesion.publicId} · {fieldLabel(locale, "site", lesion.site)} · {lesion.dog.breed}
        </p>
      </section>
      <Link href={`/case/${lesionId}/result`} className="block text-center text-sm font-bold text-terra">
        {t("detail.back")}
      </Link>
      <ReportForm lesionId={lesion.id} locale={locale} />
    </div>
  );
}
