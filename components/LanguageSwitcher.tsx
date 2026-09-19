"use client";

import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locale";
import { t } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  async function onChange(next: Locale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  return (
    <label className="block text-right text-[10px] font-extrabold tracking-wide text-mist">
      {t(locale, "language")}
      <select
        className="mt-1 block rounded-full border-0 bg-cream px-3 py-1.5 text-xs font-bold text-ink"
        value={locale}
        onChange={(event) => onChange(event.target.value as Locale)}
      >
        {LOCALES.map((item) => (
          <option key={item} value={item}>
            {LOCALE_LABELS[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
