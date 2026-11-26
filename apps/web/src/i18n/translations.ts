import { SupportedLang, UITranslations } from "./types";
import { EN } from "./locales/en";
import { HI } from "./locales/hi";
import { MR, GU, PA } from "./locales/mr_gu_pa";
import { BN, AS, OR } from "./locales/bn_as_or";
import { TA, TE, KN, ML } from "./locales/ta_te_kn_ml";

export { LANGUAGE_LABELS, VOICE_LOCALES } from "./types";
export type { SupportedLang, UITranslations } from "./types";

const ALL_TRANSLATIONS: Record<SupportedLang, UITranslations> = {
  en: EN,
  hi: HI,
  bn: BN,
  ta: TA,
  te: TE,
  mr: MR,
  gu: GU,
  kn: KN,
  ml: ML,
  pa: PA,
  or: OR,
  as: AS,
};

export function getTranslations(lang: SupportedLang): UITranslations {
  return ALL_TRANSLATIONS[lang] || EN;
}

/**
 * Returns the requested language code for server-side grounded chat,
 * dispute letters, and line-level explanations (now scaled to all 12 Indian languages).
 */
export function explanationLang(lang: SupportedLang): "en" | "hi" {
  return lang === "hi" || lang === "mr" ? "hi" : "en";
}
