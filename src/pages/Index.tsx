import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import LanguageSelector from "@/components/LanguageSelector";
import ProgressHeader from "@/components/ProgressHeader";
import ScenarioCard from "@/components/ScenarioCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { UserCircle, Users, Globe, LogOut, SunMoon } from "lucide-react";
import { ScenarioContent } from "@/types/scenario";
import { getCurrentLessonDay } from "@/lib/daily-cycle";
import { DAILY_SCENARIO_SELECT, normalizeScenario, type ScenarioQueryResult } from "@/lib/scenario-utils";

interface DailyVocabulary {
  word: string;
  translation: string;
  romanization?: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"russian" | "cantonese" | null>(null);
  const [streak, setStreak] = useState(1);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dailyVocab, setDailyVocab] = useState<DailyVocabulary[]>([]);
  const [dailyScenarios, setDailyScenarios] = useState<Record<"russian" | "cantonese", ScenarioContent | null>>({
    russian: null,
    cantonese: null,
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const dailyGoal = 100;
  const dayNumber = getCurrentLessonDay();

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
          .eq("day_number", dayNumber)
          .limit(10);

        if (vocab) {
          setDailyVocab(vocab);
        }
      }
    };

    fetchUserData();
  }, [user, dayNumber]);

  useEffect(() => {
    const fetchDailyScenario = async () => {
      const { data, error } = await supabase
        .from("daily_scenarios")
        .select(DAILY_SCENARIO_SELECT)
        .eq("day_number", dayNumber);

      if (error) {
        console.error("Error fetching scenarios:", error);
        return;
      }

      const scenarioMap: Record<"russian" | "cantonese", ScenarioContent | null> = {
        russian: null,
        cantonese: null,
      };

      data?.forEach(row => {
        const language = row.language as "russian" | "cantonese";
        scenarioMap[language] = normalizeScenario(row as ScenarioQueryResult);
      });

      setDailyScenarios(scenarioMap);
    };

    fetchDailyScenario();
  }, [dayNumber]);

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

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
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

  const currentScenario = selectedLanguage ? dailyScenarios[selectedLanguage] : null;
  const vocabCount = dailyVocab.length;

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
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe className="w-4 h-4 mr-2" />
                  Learning: {selectedLanguage === "russian" ? "Russian" : "Cantonese"}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleChangeLanguage("russian")}>
                    Russian
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleChangeLanguage("cantonese")}>
                    Cantonese
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem
                onSelect={event => event.preventDefault()}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <SunMoon className="w-4 h-4 mr-2" />
                  Dark Mode
                </div>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={handleThemeToggle}
                  aria-label="Toggle dark mode"
                />
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

        <Button
          size="lg"
          className="w-full h-auto py-8 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-card-hover dark:bg-primary/10 dark:text-primary-foreground dark:border dark:border-primary/30"
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
              {vocabCount} words to practice
            </div>
          </div>
        </Button>

        {currentScenario ? (
          <ScenarioCard
            title={currentScenario.title}
            description={currentScenario.description}
            yourRole={currentScenario.yourRole}
            partnerRole={currentScenario.partnerRole}
            language={selectedLanguage}
            scenarioId={currentScenario.id}
            onClick={() => navigate(`/scenario/${currentScenario.id}`)}
          />
        ) : (
          <div className="p-6 border border-dashed border-border rounded-xl text-center text-muted-foreground">
            Loading today's scenario...
          </div>
        )}

      </main>
    </div>
  );
};

export default Index;
