import type { Language } from "@/lib/api";

const LANGUAGE_STORAGE_KEY = "langpair-learning-language";

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

export const getLanguagePreference = (): Language | null => {
  if (!canUseStorage()) return null;
  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return value === "russian" || value === "cantonese" ? value : null;
};

export const setLanguagePreference = (language: Language) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
};
