"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PHOTO_VIEWS } from "@/lib/constants";
import { PHOTO_QC, MODEL_INPUT, VISION_GATES } from "@/lib/photo-protocol";
import { reasonLabel, t, type Locale } from "@/lib/i18n";

type Existing = {
  view: string;
  qcStatus: string;
  qcReasons: string[];
};

export function CaptureWizard({
  lesionId,
  existing,
  locale,
}: {
  lesionId: string;
  existing: Existing[];
  locale: Locale;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, File | null>>({
    overview: null,
    frontal: null,
    oblique_1: null,
    oblique_2: null,
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [qc, setQc] = useState<Existing[]>(existing);

  const byView = useMemo(() => Object.fromEntries(qc.map((item) => [item.view, item])), [qc]);

  async function loadDemo(kind: "pass" | "reject") {
    const next: Record<string, File | null> = { ...files };
    for (const view of PHOTO_VIEWS) {
      const name = kind === "reject" ? `reject-${view.id}.jpg` : `${view.id}.jpg`;
      const response = await fetch(`/demo/${name}`);
      const blob = await response.blob();
      next[view.id] = new File([blob], name, { type: "image/jpeg" });
    }
    setFiles(next);
    setMessage(kind === "reject" ? t(locale, "capture.loadedReject") : t(locale, "capture.loadedPass"));
  }

  async function upload() {
    setPending(true);
    setMessage("");
    try {
      const mode = await fetch("/api/storage-mode").then((response) => response.json());
      let response: Response;
      if (mode.blob) {
        const { uploadPresigned } = await import("@vercel/blob/client");
        const blobs: Record<string, { url: string; pathname: string; contentType: string; originalFilename: string; size: number }> = {};
        for (const view of PHOTO_VIEWS) {
          const file = files[view.id];
          if (!file) continue;
          const blob = await uploadPresigned(
            `uploads/original/${lesionId}-${view.id}-${safeFilename(file.name)}`,
            file,
            {
              access: "private",
              handleUploadUrl: "/api/blob/upload",
              contentType: file.type || "image/jpeg",
            },
          );
          blobs[view.id] = {
            url: blob.url,
            pathname: blob.pathname,
            contentType: file.type || "image/jpeg",
            originalFilename: file.name,
            size: file.size,
          };
        }
        response = await fetch(`/api/cases/${lesionId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobs }),
        });
      } else {
        const form = new FormData();
        for (const view of PHOTO_VIEWS) {
          const file = files[view.id];
          if (file) form.append(view.id, file);
        }
        response = await fetch(`/api/cases/${lesionId}/photos`, { method: "POST", body: form });
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(typeof data.error === "string" ? data.error : t(locale, "capture.uploadFail"));
        if (data.photos) setQc(data.photos);
        return;
      }
      setQc(data.photos ?? []);
      if (data.qcPassed) {
        router.push(`/case/${lesionId}/confirm`);
        return;
      }
      const reasons = ((data.reasons ?? []) as string[]).map((reason) => reasonLabel(locale, reason));
      setMessage(reasons.join("；") || t(locale, "capture.qcFail"));
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : t(locale, "capture.uploadFail"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t(locale, "capture.hint")}</p>
      <section className="card space-y-2">
        <h2 className="font-extrabold">{t(locale, "capture.optTitle")}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>{t(locale, "capture.optLight")}</li>
          <li>{t(locale, "capture.optCamera")}</li>
          <li>{t(locale, "capture.optFrame")}</li>
          <li>{t(locale, "capture.optScale")}</li>
          <li>{t(locale, "capture.optAvoid")}</li>
        </ul>
        <h3 className="pt-2 font-extrabold">{t(locale, "capture.algoTitle")}</h3>
        <p className="text-sm text-muted">{t(locale, "capture.algoLead")}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>
            {t(locale, "capture.algo1", {
              min: PHOTO_QC.minWidth,
              meanMin: PHOTO_QC.meanMin,
              meanMax: PHOTO_QC.meanMax,
              stdev: PHOTO_QC.stdevMin,
            })}
          </li>
          <li>{t(locale, "capture.algo2", { quality: PHOTO_QC.researchJpegQuality })}</li>
          <li>{t(locale, "capture.algo3", { size: MODEL_INPUT.size })}</li>
          <li>{t(locale, "capture.algo4", { cosine: VISION_GATES.minCosineReject })}</li>
        </ol>
        <p className="text-sm font-bold text-terra">{t(locale, "capture.algoNot")}</p>
      </section>
      {PHOTO_VIEWS.map((view) => {
        const current = byView[view.id];
        return (
          <section key={view.id} className="card">
            <h2 className="font-extrabold">{t(locale, `views.${view.id}`)}</h2>
            <p className="mt-1 text-sm text-muted">{t(locale, `views.${view.id}Hint`)}</p>
            <input
              className="mt-3 w-full text-sm"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) =>
                setFiles((prev) => ({ ...prev, [view.id]: event.target.files?.[0] ?? null }))
              }
            />
            {files[view.id] ? (
              <p className="mt-1 text-xs font-bold text-teal">{t(locale, "capture.selected", { name: files[view.id]?.name ?? "" })}</p>
            ) : null}
            {current ? (
              <p className={`mt-2 text-xs ${current.qcStatus === "fail" ? "font-bold text-terra" : "font-bold text-teal"}`}>
                {current.qcStatus === "fail"
                  ? t(locale, "capture.savedFail", { reasons: current.qcReasons.map((reason) => reasonLabel(locale, reason)).join("、") })
                  : t(locale, "capture.savedOk")}
              </p>
            ) : null}
          </section>
        );
      })}
      {message ? <p className="text-sm font-bold text-terra">{message}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => loadDemo("pass")} className="btn-secondary">
          {t(locale, "capture.loadPass")}
        </button>
        <button type="button" onClick={() => loadDemo("reject")} className="btn-secondary">
          {t(locale, "capture.loadReject")}
        </button>
      </div>
      <button onClick={upload} disabled={pending} className="btn-primary">
        {pending ? t(locale, "capture.checking") : t(locale, "capture.upload")}
      </button>
    </div>
  );
}

function safeFilename(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 80) || "photo.jpg";
}
