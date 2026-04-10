import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Globe, Settings2, SunMoon } from "lucide-react";
import { getCurrentLessonDay } from "@/lib/daily-cycle";
import { fetchDayOverview, type Language, type VocabularyEntry } from "@/lib/api";
import { fetchTodayTaskStatus, getCurrentStreak, TOTAL_DAILY_TASKS, type DailyTaskStatus } from "@/lib/task-progress";
import { getLanguagePreference, setLanguagePreference } from "@/lib/preferences";
import type { ScenarioContent } from "@/types/scenario";

const EMPTY_SCENARIOS: Record<Language, ScenarioContent | null> = {
  russian: null,
  cantonese: null,
};

const Index = () => {
  const [selectedLanguage, setSelectedLanguageState] = useState<Language | null>(() => getLanguagePreference());
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dailyVocab, setDailyVocab] = useState<VocabularyEntry[]>([]);
  const [dailyScenarios, setDailyScenarios] = useState<Record<Language, ScenarioContent | null>>(EMPTY_SCENARIOS);
  const [tasksCompleted, setTasksCompleted] = useState<DailyTaskStatus>({
    vocabCompleted: false,
    scenarioCompleted: false,
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const dayNumber = getCurrentLessonDay();
  const totalTasks = TOTAL_DAILY_TASKS;
  const completedTasks = Number(tasksCompleted.vocabCompleted) + Number(tasksCompleted.scenarioCompleted);

  useEffect(() => {
    fetchTodayTaskStatus().then(setTasksCompleted);
    setStreak(getCurrentStreak());
  }, []);

  useEffect(() => {
    if (!selectedLanguage) {
      setLoading(false);
      setDailyVocab([]);
      setDailyScenarios(EMPTY_SCENARIOS);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loadOverview = async () => {
      try {
        const [overview, status] = await Promise.all([
          fetchDayOverview(dayNumber, selectedLanguage),
          fetchTodayTaskStatus(),
        ]);

        if (cancelled) return;

        const scenarioMap: Record<Language, ScenarioContent | null> = { ...EMPTY_SCENARIOS };
        overview.scenarios.forEach((scenario) => {
          scenarioMap[scenario.language] = scenario;
        });

        setDailyVocab(overview.dailyVocab);
        setDailyScenarios(scenarioMap);
        setTasksCompleted(status);
        setStreak(getCurrentStreak());
      } catch (error) {
        console.error("Error loading overview", error);
        if (!cancelled) {
          setDailyVocab([]);
          setDailyScenarios(EMPTY_SCENARIOS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOverview();

    return () => {
      cancelled = true;
    };
  }, [dayNumber, selectedLanguage]);

  const handleChangeLanguage = (newLanguage: Language) => {
    setLanguagePreference(newLanguage);
    setSelectedLanguageState(newLanguage);
    toast({
      title: "Language updated",
      description: `Now learning ${newLanguage}`,
    });
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

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

  if (!selectedLanguage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LangPair
            </h1>
            <p className="text-lg text-muted-foreground">
              Learn languages through daily roleplay conversations
            </p>
          </div>
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onSelect={handleChangeLanguage}
          />
        </div>
      </div>
    );
  }

  const currentScenario = dailyScenarios[selectedLanguage];
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
                <Settings2 className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Preferences</DropdownMenuLabel>
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
                onSelect={(event) => event.preventDefault()}
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <ProgressHeader streak={streak} completedTasks={completedTasks} totalTasks={totalTasks} />

        <Button
          size="lg"
          className="w-full h-auto py-8 bg-teal-800 text-primary-foreground hover:opacity-90 shadow-card-hover dark:bg-teal-900/80 dark:text-primary-foreground dark:border dark:border-primary/30"
          onClick={() => navigate("/vocabulary-quiz")}
        >
          <div className="text-center space-y-1">
            <div className="text-sm font-medium opacity-90">
              {selectedLanguage === "russian" ? "Russian" : "Cantonese"} Vocabulary
            </div>
            <div className="text-lg font-bold">
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
