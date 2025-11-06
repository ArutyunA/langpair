import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import LanguageSelector from "@/components/LanguageSelector";
import ProgressHeader from "@/components/ProgressHeader";
import ScenarioCard from "@/components/ScenarioCard";
import PhraseCard from "@/components/PhraseCard";
import VocabularyCard from "@/components/VocabularyCard";
import AchievementBadge from "@/components/AchievementBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { scenarios, achievements } from "@/data/scenarios";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, Users, Globe, LogOut } from "lucide-react";

interface DailyVocabulary {
  word: string;
  translation: string;
  romanization?: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"russian" | "cantonese" | null>(null);
  const [completedPhrases, setCompletedPhrases] = useState(0);
  const [streak, setStreak] = useState(1);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dailyVocab, setDailyVocab] = useState<DailyVocabulary[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const dailyGoal = 100;
  const currentScenario = scenarios[0];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("learning_language")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.learning_language) {
        setSelectedLanguage(profile.learning_language as "russian" | "cantonese");
      }

      const { data: progress } = await supabase
        .from("user_progress")
        .select("streak, xp")
        .eq("user_id", user.id)
        .maybeSingle();

      if (progress) {
        setStreak(progress.streak);
        setXp(progress.xp);
      }

      if (profile?.learning_language) {
        const { data: vocab } = await supabase
          .from("daily_vocabulary")
          .select("word, translation, romanization")
          .eq("language", profile.learning_language)
          .eq("date", new Date().toISOString().split("T")[0])
          .limit(10);

        if (vocab) {
          setDailyVocab(vocab);
        }
      }
    };

    fetchUserData();
  }, [user]);

  const updateProgress = async (newXp: number) => {
    if (!user) return;

    await supabase
      .from("user_progress")
      .update({
        xp: newXp,
        last_activity_date: new Date().toISOString().split("T")[0],
      })
      .eq("user_id", user.id);
  };

  const handlePhraseComplete = async (phraseId: string) => {
    if (!user) return;

    const newXp = xp + 10;
    setCompletedPhrases(prev => prev + 1);
    setXp(newXp);

    await supabase.from("completed_phrases").insert({
      user_id: user.id,
      phrase_id: phraseId,
      scenario_id: currentScenario.id,
    });

    await updateProgress(newXp);

    toast({
      title: "+10 XP",
      description: "Great job! Keep learning!",
    });
  };

  const handleCompleteScenario = async () => {
    const newXp = xp + 50;
    setXp(newXp);
    await updateProgress(newXp);

    toast({
      title: "🎉 Scenario Complete!",
      description: "+50 XP bonus! Come back tomorrow for a new challenge.",
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleChangeLanguage = async (newLanguage: "russian" | "cantonese") => {
    if (!user) return;
    
    await supabase
      .from("profiles")
      .update({ learning_language: newLanguage })
      .eq("id", user.id);
    
    setSelectedLanguage(newLanguage);
    
    toast({
      title: "Language updated",
      description: `Now learning ${newLanguage}`,
    });
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  if (loading) {
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

  if (!user) {
    return null;
  }

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <UserCircle className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleChangeLanguage(selectedLanguage === "russian" ? "cantonese" : "russian")}>
                <Globe className="w-4 h-4 mr-2" />
                Learning: {selectedLanguage === "russian" ? "Russian" : "Cantonese"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/friends")}>
                <Users className="w-4 h-4 mr-2" />
                Learning Partners
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <ProgressHeader streak={streak} xp={xp} dailyGoal={dailyGoal} />

        {dailyVocab.length > 0 && (
          <Button
            size="lg"
            className="w-full h-auto py-8 bg-gradient-primary hover:opacity-90 shadow-card-hover"
            onClick={() => navigate("/vocabulary-quiz")}
          >
            <div className="text-center space-y-1">
              <div className="text-sm font-medium opacity-90">
                {selectedLanguage === "russian" ? "Russian" : "Cantonese"} Vocabulary
              </div>
              <div className="text-2xl font-bold">
                Daily Vocab Flash Challenge
              </div>
              <div className="text-sm opacity-75">
                {dailyVocab.length} words to practice
              </div>
            </div>
          </Button>
        )}

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
                onComplete={() => handlePhraseComplete(`${currentScenario.id}-${index}`)}
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
          <div className="grid gap-4">
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
