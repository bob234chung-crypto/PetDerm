import { ConsentForm } from "@/components/ConsentForm";
import { getRole } from "@/lib/auth";
import { fieldLabel } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const role = await getRole();
  if (role === "reviewer") redirect("/review/pathology");
  if (role === "monitor") redirect("/monitor");
  const { locale, t } = await getT();

  const consentId = (await cookies()).get("petderm-consent")?.value;
  const consent = consentId
    ? await prisma.consent.findUnique({ where: { id: consentId } })
    : null;

  if (consent && consent.status === "active") {
    const lesions = await prisma.lesion.findMany({
      where: { dog: { consentId: consent.id } },
      orderBy: { createdAt: "desc" },
      include: { dog: true, sessions: { include: { inferences: true } } },
      take: 8,
    });
    return (
      <div className="space-y-5">
        <section>
          <p className="page-kicker">{t("home.hello")}</p>
          <h2 className="page-title mt-1">{t("home.continueTitle")}</h2>
          <p className="mt-2 text-sm text-muted">{t("home.consentActive", { version: consent.version })}</p>
        </section>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <span className="chip chip-active">{t("home.chipAll")}</span>
          <span className="chip">{t("home.chipCapture")}</span>
          <span className="chip">{t("home.chipResult")}</span>
        </div>
        <Link href="/case/new" className="btn-primary">
          {t("home.newCase")}
        </Link>
        <ul className="space-y-3">
          {lesions.map((lesion) => {
            const inference = lesion.sessions[0]?.inferences[0];
            return (
              <li key={lesion.id} className="card">
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sage text-teal">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden>
                      <ellipse cx="7" cy="8" rx="2.2" ry="2.8" />
                      <ellipse cx="12" cy="5.5" rx="2.2" ry="2.8" />
                      <ellipse cx="17" cy="8" rx="2.2" ry="2.8" />
                      <path d="M8 14.5c0-1.8 1.7-3 4-3s4 1.2 4 3c0 2.4-2.1 4.5-4 5.2-1.9-.7-4-2.8-4-5.2Z" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">
                      {lesion.publicId} · {lesion.dog.publicId}
                    </p>
                    <p className="text-sm text-muted">
                      {fieldLabel(locale, "site", lesion.site)} · {inference ? t("home.hasResult") : t("home.incomplete")}
                    </p>
                    <div className="mt-2 flex gap-3 text-sm font-bold text-terra">
                      <Link href={`/case/${lesion.id}/capture`}>{t("home.capture")}</Link>
                      <Link href={`/case/${lesion.id}/confirm`}>{t("home.confirm")}</Link>
                      {inference ? <Link href={`/case/${lesion.id}/result`}>{t("home.result")}</Link> : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] bg-cream px-5 pb-8 pt-6 text-center">
        <div className="absolute -right-6 top-10 h-24 w-24 rounded-full bg-sage/70" />
        <div className="absolute -left-8 bottom-6 h-20 w-20 rounded-full bg-mist/40" />
        <p className="page-kicker relative">{t("brandTag")}</p>
        <h2 className="page-title relative mt-3 text-[2.1rem]">
          {t("home.heroTitle")}
          <span className="mt-1 block not-italic tracking-wide text-teal">{t("home.heroSub")}</span>
        </h2>
        <p className="relative mx-auto mt-3 max-w-[16rem] text-sm text-muted">{t("home.heroBody")}</p>
      </section>
      <ConsentForm locale={locale} />
    </div>
  );
}
