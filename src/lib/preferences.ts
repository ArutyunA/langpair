import type { Language } from "@/lib/api";

const LANGUAGE_STORAGE_KEY = "langpair-learning-language";
const DEFAULT_LANGUAGE: Language = "cantonese";

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

export const getLanguagePreference = (): Language => {
  if (!canUseStorage()) return DEFAULT_LANGUAGE;
  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (value === DEFAULT_LANGUAGE) {
    return DEFAULT_LANGUAGE;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE);
  return DEFAULT_LANGUAGE;
};

export const setLanguagePreference = (language: Language) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};
