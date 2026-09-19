"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

const CATEGORIES = ["photo_mismatch", "tech_failure", "possible_delay", "unexpected_use", "data_issue"] as const;

export function ReportForm({ lesionId, locale }: { lesionId?: string; locale: Locale }) {
  const router = useRouter();
  const [detail, setDetail] = useState("");
  const [category, setCategory] = useState("photo_mismatch");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesionId, category, detail }),
    });
    setDone(true);
    setDetail("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-extrabold">{t(locale, "report.title")}</h2>
      <p className="text-sm text-muted">{t(locale, "report.intro")}</p>
      <select value={category} onChange={(event) => setCategory(event.target.value)} className="field">
        {CATEGORIES.map((item) => (
          <option key={item} value={item}>
            {t(locale, `report.${item}`)}
          </option>
        ))}
      </select>
      <textarea
        required
        value={detail}
        onChange={(event) => setDetail(event.target.value)}
        className="field"
        placeholder={t(locale, "report.placeholder")}
      />
      <button className="btn-primary">{t(locale, "report.submit")}</button>
      {done ? <p className="text-sm font-bold text-teal">{t(locale, "report.done")}</p> : null}
    </form>
  );
}
