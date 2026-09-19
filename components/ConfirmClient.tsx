"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";
import { RoiEditor, type RoiState } from "./RoiEditor";

type Photo = { id: string; view: string };

const DEFAULT_ROIS: RoiState[] = [
  { view: "overview", x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
  { view: "frontal", x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
  { view: "oblique_1", x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
  { view: "oblique_2", x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
];

export function ConfirmClient({
  lesionId,
  photos,
  locale,
}: {
  lesionId: string;
  photos: Photo[];
  locale: Locale;
}) {
  const router = useRouter();
  const [rois, setRois] = useState<RoiState[]>(DEFAULT_ROIS);
  const [visibleRoi, setVisibleRoi] = useState(true);
  const [physicalMatch, setPhysicalMatch] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function infer() {
    setPending(true);
    setError("");
    const response = await fetch(`/api/cases/${lesionId}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rois, visibleRoi, physicalMatch }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? t(locale, "confirm.inferFail"));
      if (data.redirectToCapture) router.push(`/case/${lesionId}/capture`);
      return;
    }
    router.push(`/case/${lesionId}/result`);
  }

  return (
    <div className="space-y-4">
      <RoiEditor photos={photos} value={rois} onChange={setRois} locale={locale} />
      <label className="card flex items-start gap-2 text-sm">
        <input type="checkbox" checked={visibleRoi} onChange={(event) => setVisibleRoi(event.target.checked)} />
        <span>{t(locale, "confirm.visible")}</span>
      </label>
      <label className="card flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={physicalMatch}
          onChange={(event) => setPhysicalMatch(event.target.checked)}
        />
        <span>{t(locale, "confirm.match")}</span>
      </label>
      {error ? <p className="text-sm font-bold text-terra">{error}</p> : null}
      <button onClick={infer} disabled={pending} className="btn-primary">
        {pending ? t(locale, "confirm.pending") : t(locale, "confirm.submit")}
      </button>
    </div>
  );
}
