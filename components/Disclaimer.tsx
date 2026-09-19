import { t, type Locale } from "@/lib/i18n";

export function Disclaimer({ locale, extra }: { locale: Locale; extra?: string }) {
  return (
    <aside className="banner text-sm leading-relaxed">
      <p className="font-bold text-terra">{t(locale, "disclaimerTitle")}</p>
      <p className="mt-1">{t(locale, "disclaimer")}</p>
      {extra ? <p className="mt-2 text-muted">{extra}</p> : null}
    </aside>
  );
}
