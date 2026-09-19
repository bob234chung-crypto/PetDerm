"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONSENT_VERSION } from "@/lib/constants";
import { t, type Locale } from "@/lib/i18n";
import { Disclaimer } from "./Disclaimer";

export function ConsentForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [signerName, setSignerName] = useState("");
  const [secondaryUse, setSecondaryUse] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!accepted) {
      setError(t(locale, "consent.needAccept"));
      return;
    }
    setPending(true);
    const response = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerName, secondaryUse }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? t(locale, "consent.saveFail"));
      return;
    }
    router.push("/case/new");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Disclaimer locale={locale} extra={t(locale, "consent.extra")} />
      <section className="card space-y-2 text-sm leading-relaxed">
        <h2 className="font-extrabold">{t(locale, "consent.title")}</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>{t(locale, "consent.l1")}</li>
          <li>{t(locale, "consent.l2")}</li>
          <li>{t(locale, "consent.l3")}</li>
          <li>{t(locale, "consent.l4")}</li>
        </ul>
        <p className="text-xs text-muted">{t(locale, "consent.version", { version: CONSENT_VERSION })}</p>
      </section>
      <label className="block text-sm font-bold">
        {t(locale, "consent.signer")}
        <input
          required
          value={signerName}
          onChange={(event) => setSignerName(event.target.value)}
          className="field"
          placeholder={t(locale, "consent.signerPh")}
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>{t(locale, "consent.accept")}</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={secondaryUse}
          onChange={(event) => setSecondaryUse(event.target.checked)}
        />
        <span>{t(locale, "consent.secondary")}</span>
      </label>
      {error ? <p className="text-sm font-bold text-terra">{error}</p> : null}
      <button disabled={pending} className="btn-primary">
        {pending ? t(locale, "consent.saving") : t(locale, "consent.submit")}
      </button>
    </form>
  );
}
