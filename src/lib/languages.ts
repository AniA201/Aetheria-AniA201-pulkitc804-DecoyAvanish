// The participant screen languages. English is the official consent language; the others are
// machine-written for this practice app and labelled as not reviewed.
export type Language = "en" | "es" | "fr" | "zh";
export type OtherLanguage = Exclude<Language, "en">;

export const languages: Language[] = ["en", "es", "fr", "zh"];
export const otherLanguages: OtherLanguage[] = ["es", "fr", "zh"];

export const languageInfo: Record<Language, { native: string; english: string; html: string; dock: string; voice: string }> = {
  en: { native: "English", english: "English", html: "en", dock: "EN", voice: "en-US" },
  es: { native: "Español", english: "Spanish", html: "es", dock: "ES", voice: "es-US" },
  fr: { native: "Français", english: "French", html: "fr", dock: "FR", voice: "fr-FR" },
  zh: { native: "中文（普通话）", english: "Mandarin Chinese", html: "zh-CN", dock: "中", voice: "zh-CN" },
};

export const isLanguage = (value: unknown): value is Language => typeof value === "string" && (languages as string[]).includes(value);
