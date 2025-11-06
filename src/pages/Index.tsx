import { useState } from "react";
import LanguageSelector from "@/components/LanguageSelector";
import ProgressHeader from "@/components/ProgressHeader";
import ScenarioCard from "@/components/ScenarioCard";
import PhraseCard from "@/components/PhraseCard";
import AchievementBadge from "@/components/AchievementBadge";
import { Button } from "@/components/ui/button";
import { scenarios, achievements } from "@/data/scenarios";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<"russian" | "cantonese" | null>(null);
  const [completedPhrases, setCompletedPhrases] = useState(0);
  const [streak, setStreak] = useState(1);
  const [xp, setXp] = useState(0);
  const { toast } = useToast();

  const dailyGoal = 100;
  const currentScenario = scenarios[0];

  const handlePhraseComplete = () => {
    setCompletedPhrases(prev => prev + 1);
    setXp(prev => prev + 10);
    toast({
      title: "+10 XP",
      description: "Great job! Keep learning!",
    });
  };

  const handleCompleteScenario = () => {
    setXp(prev => prev + 50);
    toast({
      title: "🎉 Scenario Complete!",
      description: "+50 XP bonus! Come back tomorrow for a new challenge.",
    });
  };

  if (!selectedLanguage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LangPair
            </h1>
            <p className="text-lg text-muted-foreground">
              Learn languages together through roleplay conversations
            </p>
          </div>
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onSelect={setSelectedLanguage}
          />
        </div>
      </div>
    );
  }

  const phrases = selectedLanguage === "russian" 
    ? currentScenario.russianPhrases 
    : currentScenario.cantonesePhrases;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            LangPair
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedLanguage(null)}
          >
            Change Language
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <ProgressHeader streak={streak} xp={xp} dailyGoal={dailyGoal} />

        <ScenarioCard
          title={currentScenario.title}
          description={currentScenario.description}
          yourRole={currentScenario.yourRole}
          partnerRole={currentScenario.partnerRole}
          language={selectedLanguage}
        />

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Practice Phrases</h2>
          <div className="grid gap-4">
            {phrases.map((phrase, index) => (
              <PhraseCard
                key={index}
                phrase={phrase.phrase}
                translation={phrase.translation}
                romanization={phrase.romanization}
                onComplete={handlePhraseComplete}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-card-hover px-8"
            onClick={handleCompleteScenario}
          >
            Complete Scenario
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map(achievement => (
              <AchievementBadge key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
