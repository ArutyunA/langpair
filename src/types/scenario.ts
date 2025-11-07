export interface ScenarioPhrase {
  id: string;
  orderIndex: number;
  phrase: string;
  translation: string;
  romanization?: string | null;
}

export interface ScenarioPrompt {
  id: string;
  orderIndex: number;
  prompt: string;
}

export interface ScenarioContent {
  id: string;
  dayNumber: number;
  language: "russian" | "cantonese";
  title: string;
  description: string;
  yourRole: string;
  partnerRole: string;
  phrases: ScenarioPhrase[];
  prompts: ScenarioPrompt[];
}
