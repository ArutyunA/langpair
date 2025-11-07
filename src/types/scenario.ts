export interface ScenarioPhrase {
  id: string;
  orderIndex: number;
  phrase: string;
  translation: string;
  romanization?: string | null;
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
}
