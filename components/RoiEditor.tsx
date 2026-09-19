"use client";

import { useRef, useState } from "react";
import { PHOTO_VIEWS } from "@/lib/constants";
import { t, type Locale } from "@/lib/i18n";

export type RoiState = {
  view: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Photo = {
  id: string;
  view: string;
};

export function RoiEditor({
  photos,
  value,
  onChange,
  locale,
}: {
  photos: Photo[];
  value: RoiState[];
  onChange: (next: RoiState[]) => void;
  locale: Locale;
}) {
  return (
    <div className="space-y-4">
      {PHOTO_VIEWS.map((view) => {
        const photo = photos.find((item) => item.view === view.id);
        const roi = value.find((item) => item.view === view.id);
        if (!photo || !roi) return null;
        return (
          <section key={view.id} className="card">
            <h3 className="text-sm font-semibold">{t(locale, `views.${view.id}`)}</h3>
            <p className="mb-2 text-xs text-muted">{t(locale, "confirm.roiHint")}</p>
            <RoiCanvas
              src={`/api/media/${photo.id}`}
              roi={roi}
              alt={t(locale, "confirm.photoAlt")}
              onChange={(next) =>
                onChange(value.map((item) => (item.view === view.id ? { ...item, ...next } : item)))
              }
            />
          </section>
        );
      })}
    </div>
  );
}

function RoiCanvas({
  src,
  roi,
  alt,
  onChange,
}: {
  src: string;
  roi: RoiState;
  alt: string;
  onChange: (next: Pick<RoiState, "x" | "y" | "width" | "height">) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  function point(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-sand"
      onPointerDown={(event) => {
        const p = point(event);
        setDrag(p);
        onChange({ x: p.x, y: p.y, width: 0.02, height: 0.02 });
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag) return;
        const p = point(event);
        onChange({
          x: Math.min(drag.x, p.x),
          y: Math.min(drag.y, p.y),
          width: Math.max(0.04, Math.abs(p.x - drag.x)),
          height: Math.max(0.04, Math.abs(p.y - drag.y)),
        });
      }}
      onPointerUp={() => setDrag(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} alt={alt} className="block w-full select-none" />
      <div
        className="pointer-events-none absolute border-2 border-terra bg-terra/15"
        style={{
          left: `${roi.x * 100}%`,
          top: `${roi.y * 100}%`,
          width: `${roi.width * 100}%`,
          height: `${roi.height * 100}%`,
        }}
      />
    </div>
  );
}
