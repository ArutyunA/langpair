import type { ScenarioContent } from "@/types/scenario";

export type Language = "russian" | "cantonese";

export interface VocabularyEntry {
  createdAt?: string;
  dayNumber: number;
  language: Language;
  romanization?: string | null;
  translation: string;
  ttsBucket?: string | null;
  ttsLastGeneratedAt?: string | null;
  ttsStoragePath?: string | null;
  ttsVoiceId?: string | null;
  word: string;
}

export interface DayOverviewResponse {
  dailyVocab: VocabularyEntry[];
  dayNumber: number;
  language: Language;
  scenarios: ScenarioContent[];
}

export interface ScenarioDetailResponse {
  scenario: ScenarioContent;
  vocabHighlights: VocabularyEntry[];
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const request = async <T>(pathname: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${pathname}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const fetchDayOverview = async (
  dayNumber: number,
  language: Language,
): Promise<DayOverviewResponse> => {
  const params = new URLSearchParams({ language });
  return request<DayOverviewResponse>(`/api/day/${dayNumber}/overview?${params.toString()}`);
};

export const fetchDailyVocabulary = async (
  dayNumber: number,
  language: Language,
): Promise<VocabularyEntry[]> => {
  const params = new URLSearchParams({ language });
  const payload = await request<{ vocabulary: VocabularyEntry[] }>(
    `/api/day/${dayNumber}/vocabulary?${params.toString()}`,
  );
  return payload.vocabulary;
};

export const fetchScenarioDetail = async (scenarioId: string): Promise<ScenarioDetailResponse> =>
  request<ScenarioDetailResponse>(`/api/scenarios/${scenarioId}`);
