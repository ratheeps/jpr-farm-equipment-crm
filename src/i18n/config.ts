export const locales = ["ta", "si", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ta";

export const localeNames: Record<Locale, string> = {
  ta: "தமிழ்",
  si: "සිංහල",
  en: "English",
};
