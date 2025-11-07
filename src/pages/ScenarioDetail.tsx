import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { DAILY_SCENARIO_SELECT, normalizeScenario, type ScenarioQueryResult } from "@/lib/scenario-utils";
import type { ScenarioContent } from "@/types/scenario";

interface PhraseState {
  showRomanization: boolean;
  showTranslation: boolean;
}

interface VocabularyEntry {
  word: string;
  translation: string;
  romanization?: string | null;
}

const ScenarioDetail = () => {
  const { scenarioId } = useParams();
  const [scenario, setScenario] = useState<ScenarioContent | null>(null);
  const [phraseStates, setPhraseStates] = useState<PhraseState[]>([]);
  const [loadingScenario, setLoadingScenario] = useState(true);
  const [vocabHighlights, setVocabHighlights] = useState<VocabularyEntry[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchScenario = async () => {
      if (!scenarioId) return;

      const { data, error } = await supabase
        .from("daily_scenarios")
        .select(DAILY_SCENARIO_SELECT)
        .eq("id", scenarioId)
        .maybeSingle();

      if (error) {
        console.error("Error loading scenario", error);
        setLoadingScenario(false);
        return;
      }

      if (data) {
        const normalized = normalizeScenario(data as ScenarioQueryResult);
        setScenario(normalized);
        setPhraseStates(normalized.phrases.map(() => ({ showRomanization: false, showTranslation: false })));
      }

      setLoadingScenario(false);
    };

    fetchScenario();
  }, [scenarioId]);

  useEffect(() => {
    const fetchVocabulary = async () => {
      if (!scenario) return;
      const { data, error } = await supabase
        .from("daily_vocabulary")
        .select("word, translation, romanization")
        .eq("day_number", scenario.dayNumber)
        .eq("language", scenario.language)
        .limit(5);

      if (error) {
        console.error("Error loading vocabulary highlights", error);
        return;
      }

      setVocabHighlights(data ?? []);
    };

    fetchVocabulary();
  }, [scenario]);

  const handlePhraseClick = (index: number) => {
    setPhraseStates(prev => {
      const newStates = [...prev];
      const current = newStates[index];
      
      if (!current.showRomanization && !current.showTranslation) {
        newStates[index] = { showRomanization: true, showTranslation: false };
      } else if (current.showRomanization && !current.showTranslation) {
        newStates[index] = { showRomanization: true, showTranslation: true };
      } else {
        newStates[index] = { showRomanization: false, showTranslation: false };
      }
      
      return newStates;
    });
  };

  const handleCompleteScenario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: progress } = await supabase
      .from("user_progress")
      .select("xp")
      .eq("user_id", user.id)
      .single();

    if (progress) {
      const newXp = progress.xp + 50;
      await supabase
        .from("user_progress")
        .update({ xp: newXp })
        .eq("user_id", user.id);

      toast({
        title: "🎉 Scenario Complete!",
        description: "+50 XP bonus! Come back tomorrow for a new challenge.",
      });

      navigate("/");
    }
  };

  if (loadingScenario || !scenario || phraseStates.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  const phrases = scenario.phrases;
  const promptHighlights = scenario.prompts ?? [];
  const showRomanization = scenario.language === "cantonese";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {scenario.title}
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-2 pb-4 border-b text-center">
                  <h2 className="text-xl font-bold text-foreground">{scenario.description}</h2>
                </div>

                {vocabHighlights.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Key Vocabulary</h3>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
                      {vocabHighlights.map((entry, index) => (
                        <div key={`${entry.word}-${index}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                          <div>
                            <p className="font-semibold text-foreground">{entry.word}</p>
                            {showRomanization && entry.romanization && (
                              <p className="text-xs text-muted-foreground">{entry.romanization}</p>
                            )}
                          </div>
                          <span>{entry.translation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {promptHighlights.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Conversation Prompts</h3>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 text-left">
                      {promptHighlights.map(prompt => (
                        <li key={prompt.id}>{prompt.prompt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-sm text-muted-foreground text-center">
                  Tap any example phrase below to reveal romanization and translation.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Example Phrases</h3>
            {phrases.map((phrase, index) => {
              const state = phraseStates[index];
              if (!state) return null; // Safety check
              const isYourLine = index % 2 === 0;

              return (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isYourLine ? "ml-0 mr-12" : "ml-12 mr-0"
                  }`}
                  onClick={() => handlePhraseClick(index)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">
                        {isYourLine ? scenario.yourRole : scenario.partnerRole}
                      </div>
                      
                      <div className="text-2xl font-bold text-foreground leading-relaxed">
                        {phrase.phrase}
                      </div>

                      {state.showRomanization && showRomanization && phrase.romanization && (
                        <div className="text-lg text-primary/80 italic">
                          {phrase.romanization}
                        </div>
                      )}

                      {state.showTranslation && (
                        <div className="text-base text-muted-foreground pt-2 border-t">
                          {phrase.translation}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-center pt-6">
            <Button
              size="lg"
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-card-hover px-8"
              onClick={handleCompleteScenario}
            >
              Complete Scenario
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScenarioDetail;
