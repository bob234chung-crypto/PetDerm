import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale, type Locale } from "./locale";
import { t } from "./index";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (value && isLocale(value)) return value;
  return "zh";
}

export async function getT() {
  const locale = await getLocale();
  return {
    locale,
    t: (path: string, vars?: Record<string, string | number>) => t(locale, path, vars),
  };
}
