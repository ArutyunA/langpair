import type { Tables } from "@/integrations/supabase/types";
import type { ScenarioContent } from "@/types/scenario";

export type ScenarioRow = Tables<"daily_scenarios">;
export type ScenarioPhraseRow = Tables<"daily_scenario_phrases">;
export type ScenarioPromptRow = Tables<"daily_scenario_prompts">;

export type ScenarioQueryResult = ScenarioRow & {
  phrases: ScenarioPhraseRow[] | null;
  prompts: ScenarioPromptRow[] | null;
};

export const DAILY_SCENARIO_SELECT = `
  id,
  day_number,
  language,
  title,
  description,
  your_role,
  partner_role,
  phrases:daily_scenario_phrases(id, order_index, phrase, translation, romanization, tts_storage_path),
  prompts:daily_scenario_prompts(id, order_index, prompt)
`;

export const normalizeScenario = (row: ScenarioQueryResult): ScenarioContent => {
  const language = row.language as "russian" | "cantonese";
  const phrases = (row.phrases ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map<ScenarioContent["phrases"][number]>(phrase => ({
      id: phrase.id,
      orderIndex: phrase.order_index,
      phrase: phrase.phrase,
      translation: phrase.translation,
      romanization: phrase.romanization,
      ttsStoragePath: phrase.tts_storage_path ?? null,
    }));

  const prompts = (row.prompts ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map<ScenarioContent["prompts"][number]>(prompt => ({
      id: prompt.id,
      orderIndex: prompt.order_index,
      prompt: prompt.prompt,
    }));

  return {
    id: row.id,
    dayNumber: row.day_number,
    language,
    title: row.title,
    description: row.description,
    yourRole: row.your_role,
    partnerRole: row.partner_role,
    phrases,
    prompts,
  };
};
