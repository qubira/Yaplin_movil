export const LOCALES = ["es", "en", "qu", "ay", "cni", "agr"] as const;
export type Locale = typeof LOCALES[number];
export const ENABLED_LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_META: Record<Locale, { nativeName: string; comingSoon: boolean }> = {
  es:  { nativeName: "Español",   comingSoon: false },
  en:  { nativeName: "English",   comingSoon: false },
  qu:  { nativeName: "Quechua",   comingSoon: true },
  ay:  { nativeName: "Aimara",    comingSoon: true },
  cni: { nativeName: "Asháninka", comingSoon: true },
  agr: { nativeName: "Awajún",    comingSoon: true },
};
