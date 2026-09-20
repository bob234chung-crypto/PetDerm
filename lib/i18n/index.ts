import { dictionaries, type zh } from "./messages";
import { type Locale } from "./locale";

export type { Locale };
export { LOCALES, LOCALE_LABELS, HTML_LANG, LOCALE_COOKIE, isLocale } from "./locale";

export type Messages = typeof zh;

type Path = string;

export function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

export function t(locale: Locale, path: Path, vars?: Record<string, string | number>) {
  const parts = path.split(".");
  let current: unknown = dictionaries[locale];
  for (let i = 0; i < parts.length; i++) {
    if (!current || typeof current !== "object") {
      current = undefined;
      break;
    }
    const obj = current as Record<string, unknown>;
    const rest = parts.slice(i).join(".");
    if (rest in obj) {
      current = obj[rest];
      break;
    }
    if (parts[i] in obj) {
      current = obj[parts[i]];
    } else {
      current = undefined;
      break;
    }
  }
  if (typeof current !== "string") return path;
  return interpolate(current, vars);
}

const SITE_ALIAS: Record<string, string> = {
  頭部: "head",
  頸部: "neck",
  軀幹: "trunk",
  前肢: "forelimb",
  後肢: "hindlimb",
  腹部: "abdomen",
  "會陰／尾部": "perineum",
  其他: "other",
  淺色: "light",
  深色: "dark",
  花斑: "piebald",
  不確定: "unknown",
  短毛: "short",
  中毛: "medium",
  長毛: "long",
  室內日光燈: "indoor_fluorescent",
  室內自然光: "indoor_daylight",
  室外陰天: "outdoor_overcast",
  室外直射: "outdoor_sun",
  閃燈: "flash",
  FNA: "fna",
  穿刺活檢: "punch",
  切除活檢: "excision_biopsy",
  手術切除: "surgical",
  米克斯: "mixed",
  黃金獵犬: "golden_retriever",
  拉布拉多: "labrador",
};

export function formatTriage(
  locale: Locale,
  status: "needs_vet_review" | "cannot_assess",
  rejectReasons: string[],
) {
  const first = reasonLabel(locale, rejectReasons[0] ?? "gate.failed");
  if (status === "cannot_assess") {
    return {
      headline: t(locale, "triage.cannot", { reason: first }),
      explanation: t(locale, "result.cannot"),
    };
  }
  return {
    headline: t(locale, "triage.review"),
    explanation: t(locale, "result.pass"),
  };
}

export function dateLocale(locale: Locale) {
  if (locale === "zh") return "zh-HK";
  if (locale === "de") return "de-DE";
  return "en-GB";
}

export function fieldLabel(
  locale: Locale,
  group: "site" | "coat" | "coatLen" | "lighting" | "sample" | "breed",
  value: string,
) {
  const key = SITE_ALIAS[value] ?? value;
  const translated = t(locale, `${group}.${key}`);
  return translated === `${group}.${key}` ? value : translated;
}

export function reasonLabel(locale: Locale, reason: string) {
  const translated = t(locale, `reason.${reason}`);
  return translated === `reason.${reason}` ? reason : translated;
}

export const COAT_COLOR_IDS = ["light", "dark", "piebald", "unknown"] as const;
export const COAT_LENGTH_IDS = ["short", "medium", "long", "unknown"] as const;
export const SITE_IDS = ["head", "neck", "trunk", "forelimb", "hindlimb", "abdomen", "perineum", "other"] as const;
export const LIGHTING_IDS = [
  "indoor_fluorescent",
  "indoor_daylight",
  "outdoor_overcast",
  "outdoor_sun",
  "flash",
] as const;
export const SAMPLE_IDS = ["fna", "punch", "excision_biopsy", "surgical", "other"] as const;
export const VIEW_IDS = ["overview", "frontal", "oblique_1", "oblique_2"] as const;
export const BREED_IDS = [
  "mixed",
  "golden_retriever",
  "labrador",
  "poodle",
  "shih_tzu",
  "maltese",
  "pomeranian",
  "chihuahua",
  "french_bulldog",
  "german_shepherd",
  "siberian_husky",
  "corgi",
  "beagle",
  "schnauzer",
  "yorkshire_terrier",
  "dachshund",
  "border_collie",
  "shiba",
  "chow_chow",
  "samoyed",
  "pug",
  "bichon",
  "cocker_spaniel",
  "rottweiler",
  "boxer",
  "akita",
  "jack_russell",
  "malinois",
  "other",
] as const;
