"use client";

import { useState } from "react";
import { SAMPLE_IDS, fieldLabel, t, type Locale } from "@/lib/i18n";

type Row = {
  lesionId: string;
  publicId: string;
  dogPublicId: string;
  site: string;
  inferred: string | null;
  pathology: {
    sampleType: string | null;
    labName: string | null;
    reportSummary: string | null;
    tumorType: string | null;
    malignancyLabel: string;
    certainty: string;
    reviewerName: string;
    sampledAt: string | null;
  } | null;
};

export function PathologyReview({ rows, locale }: { rows: Row[]; locale: Locale }) {
  const [items, setItems] = useState(rows);
  const [selected, setSelected] = useState(rows[0]?.lesionId ?? "");
  const current = items.find((item) => item.lesionId === selected);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/pathology", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lesionId: current.lesionId,
        sampleType: form.get("sampleType"),
        labName: form.get("labName"),
        reportSummary: form.get("reportSummary"),
        tumorType: form.get("tumorType"),
        malignancyLabel: form.get("malignancyLabel"),
        certainty: form.get("certainty"),
        reviewerName: form.get("reviewerName"),
        sampledAt: form.get("sampledAt") || null,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setItems((prev) =>
        prev.map((item) => (item.lesionId === current.lesionId ? { ...item, pathology: data.record } : item)),
      );
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.lesionId}>
            <button
              onClick={() => setSelected(item.lesionId)}
              className={`w-full rounded-3xl p-4 text-left text-sm ${
                item.lesionId === selected ? "bg-ink text-white" : "card"
              }`}
            >
              <p className="font-medium">{item.publicId}</p>
              <p className="opacity-80">
                {fieldLabel(locale, "site", item.site)} · {item.pathology ? item.pathology.malignancyLabel : t(locale, "pathology.unlinked")}
              </p>
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <form key={current.lesionId} onSubmit={save} className="card space-y-3 text-sm">
          <h2 className="font-semibold">
            {current.publicId}／{current.dogPublicId}
          </h2>
          <p className="text-muted">
            {t(locale, "pathology.inferred", { status: current.inferred ?? t(locale, "pathology.noneYet") })}
          </p>
          <label className="block">
            {t(locale, "pathology.sampledAt")}
            <input
              type="date"
              name="sampledAt"
              defaultValue={current.pathology?.sampledAt?.slice(0, 10) ?? ""}
              className="field"
            />
          </label>
          <label className="block">
            {t(locale, "pathology.sampleType")}
            <select
              name="sampleType"
              defaultValue={current.pathology?.sampleType ?? SAMPLE_IDS[0]}
              className="field"
            >
              {SAMPLE_IDS.map((type) => (
                <option key={type} value={type}>
                  {t(locale, `sample.${type}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            {t(locale, "pathology.lab")}
            <input
              name="labName"
              defaultValue={current.pathology?.labName ?? ""}
              className="field"
            />
          </label>
          <label className="block">
            {t(locale, "pathology.tumor")}
            <input
              name="tumorType"
              defaultValue={current.pathology?.tumorType ?? ""}
              className="field"
            />
          </label>
          <label className="block">
            {t(locale, "pathology.malignancy")}
            <select
              name="malignancyLabel"
              defaultValue={current.pathology?.malignancyLabel ?? "uncertain"}
              className="field"
            >
              <option value="yes">{t(locale, "pathology.yes")}</option>
              <option value="no">{t(locale, "pathology.no")}</option>
              <option value="uncertain">{t(locale, "pathology.uncertain")}</option>
              <option value="excluded">{t(locale, "pathology.excluded")}</option>
            </select>
          </label>
          <label className="block">
            {t(locale, "pathology.certainty")}
            <select
              name="certainty"
              defaultValue={current.pathology?.certainty ?? "uncertain"}
              className="field"
            >
              <option value="certain">{t(locale, "pathology.certain")}</option>
              <option value="uncertain">{t(locale, "pathology.uncertain")}</option>
            </select>
          </label>
          <label className="block">
            {t(locale, "pathology.reviewer")}
            <input
              name="reviewerName"
              defaultValue={current.pathology?.reviewerName ?? "reviewer-demo"}
              className="field"
            />
          </label>
          <label className="block">
            {t(locale, "pathology.summary")}
            <textarea
              name="reportSummary"
              defaultValue={current.pathology?.reportSummary ?? ""}
              className="field"
            />
          </label>
          <button className="btn-primary">{t(locale, "pathology.save")}</button>
        </form>
      ) : (
        <p>{t(locale, "pathology.empty")}</p>
      )}
    </div>
  );
}
