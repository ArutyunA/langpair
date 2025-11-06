import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { scenarios } from "@/data/scenarios";

interface PhraseState {
  showRomanization: boolean;
  showTranslation: boolean;
}

const ScenarioDetail = () => {
  const { scenarioId } = useParams();
  const [language, setLanguage] = useState<"russian" | "cantonese" | null>(null);
  const [phraseStates, setPhraseStates] = useState<PhraseState[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const scenario = scenarios.find(s => s.id === scenarioId);

  useEffect(() => {
    fetchLanguage();
  }, []);

  useEffect(() => {
    if (scenario && language) {
      const phrases = language === "russian" ? scenario.russianPhrases : scenario.cantonesePhrases;
      setPhraseStates(phrases.map(() => ({ showRomanization: false, showTranslation: false })));
    }
  }, [scenario, language]);

  const fetchLanguage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("learning_language")
      .eq("id", user.id)
      .single();

    if (profile) {
      setLanguage(profile.learning_language as "russian" | "cantonese");
    }
  };

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

  if (!scenario || !language) {
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

  const phrases = language === "russian" ? scenario.russianPhrases : scenario.cantonesePhrases;

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
              <div className="space-y-4">
                <div className="text-center space-y-2 pb-4 border-b">
                  <h2 className="text-xl font-bold text-foreground">{scenario.description}</h2>
                  <div className="flex justify-around text-sm text-muted-foreground">
                    <div>
                      <span className="font-semibold">You:</span> {scenario.yourRole}
                    </div>
                    <div>
                      <span className="font-semibold">Partner:</span> {scenario.partnerRole}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground text-center">
                  Click on any phrase to reveal romanization and translation
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {phrases.map((phrase, index) => {
              const state = phraseStates[index];
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

                      {state.showRomanization && phrase.romanization && (
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
