import { MODEL_VERSION } from "@/lib/constants";
import { dateLocale, reasonLabel, t, type Locale } from "@/lib/i18n";
import { Disclaimer } from "./Disclaimer";

type ViewScore = {
  view: string;
  energy: number;
  maxSoftmax?: number;
};

export function TriageResult({
  locale,
  status,
  headline,
  explanation,
  rejectReasons,
  createdAt,
  auditId,
  perViewScores,
  uncertainty,
  oodFlag,
  weightsHash,
}: {
  locale: Locale;
  status: "needs_vet_review" | "cannot_assess";
  headline: string;
  explanation: string;
  rejectReasons: string[];
  createdAt: string;
  auditId: string;
  perViewScores?: ViewScore[];
  uncertainty?: string;
  oodFlag?: boolean;
  weightsHash?: string;
}) {
  const tone = status === "cannot_assess" ? "bg-mist/25 text-ink" : "bg-sage/50 text-ink";

  return (
    <div className="space-y-4">
      <Disclaimer locale={locale} extra={t(locale, "result.extra")} />
      <section className={`rounded-[1.5rem] p-4 ${tone}`}>
        <p className="text-xs uppercase tracking-wide text-muted">
          {status === "cannot_assess" ? t(locale, "result.cannotLabel") : t(locale, "result.signalLabel")}
        </p>
        <h2 className="mt-2 text-lg font-semibold leading-snug">{headline}</h2>
        <p className="mt-2 text-sm leading-relaxed">{explanation}</p>
        {rejectReasons.length > 0 ? (
          <ul className="mt-3 list-disc pl-5 text-sm">
            {rejectReasons.map((reason) => (
              <li key={reason}>{reasonLabel(locale, reason)}</li>
            ))}
          </ul>
        ) : null}
      </section>
      <p className="card text-sm text-muted">{t(locale, "mctNotIncluded")}</p>
      {perViewScores && perViewScores.length > 0 ? (
        <section className="card text-sm">
          <h3 className="font-extrabold">{t(locale, "result.perView")}</h3>
          <p className="mt-1 text-muted">{t(locale, "result.perViewHint")}</p>
          <ul className="mt-3 space-y-1">
            {perViewScores.map((score) => (
              <li key={score.view} className="flex justify-between gap-3">
                <span>{t(locale, `views.${score.view}`)}</span>
                <span className="text-muted">energy {score.energy}</span>
              </li>
            ))}
          </ul>
          {uncertainty ? (
            <p className="mt-3 text-muted">
              {t(locale, "result.uncertainty", { level: uncertainty })}
              {oodFlag ? t(locale, "result.ood") : ""}
            </p>
          ) : null}
        </section>
      ) : null}
      <dl className="grid grid-cols-2 gap-2 text-xs text-muted">
        <div>
          <dt>{t(locale, "result.modelVersion")}</dt>
          <dd className="text-ink">{MODEL_VERSION}</dd>
        </div>
        <div>
          <dt>{t(locale, "result.weights")}</dt>
          <dd className="break-all text-ink">{weightsHash || "—"}</dd>
        </div>
        <div>
          <dt>{t(locale, "result.audit")}</dt>
          <dd className="break-all text-ink">{auditId}</dd>
        </div>
        <div>
          <dt>{t(locale, "result.time")}</dt>
          <dd className="text-ink">{new Date(createdAt).toLocaleString(dateLocale(locale))}</dd>
        </div>
        <div>
          <dt>{t(locale, "result.percent")}</dt>
          <dd className="text-ink">{t(locale, "result.noPercent")}</dd>
        </div>
      </dl>
    </div>
  );
}
