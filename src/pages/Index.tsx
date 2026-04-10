import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Loader2, Settings2, SunMoon, Volume2 } from "lucide-react";
import { getCurrentLessonDay } from "@/lib/daily-cycle";
import { fetchDayOverview, type Language, type VocabularyEntry } from "@/lib/api";
import { fetchTodayTaskStatus, getCurrentStreak, TOTAL_DAILY_TASKS, type DailyTaskStatus } from "@/lib/task-progress";
import { resolveAudioUrls } from "@/lib/audio";
import { setLanguagePreference } from "@/lib/preferences";
import type { ScenarioContent } from "@/types/scenario";

const EMPTY_SCENARIOS: Record<Language, ScenarioContent | null> = {
  russian: null,
  cantonese: null,
};
const SELECTED_LANGUAGE: Language = "cantonese";

const Index = () => {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dailyVocab, setDailyVocab] = useState<VocabularyEntry[]>([]);
  const [dailyScenarios, setDailyScenarios] = useState<Record<Language, ScenarioContent | null>>(EMPTY_SCENARIOS);
  const [tasksCompleted, setTasksCompleted] = useState<DailyTaskStatus>({
    vocabCompleted: false,
    scenarioCompleted: false,
  });
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const dayNumber = getCurrentLessonDay();
  const totalTasks = TOTAL_DAILY_TASKS;
  const completedTasks = Number(tasksCompleted.vocabCompleted) + Number(tasksCompleted.scenarioCompleted);

  useEffect(() => {
    setLanguagePreference(SELECTED_LANGUAGE);
    fetchTodayTaskStatus().then(setTasksCompleted);
    setStreak(getCurrentStreak());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadOverview = async () => {
      try {
        const [overview, status] = await Promise.all([
          fetchDayOverview(dayNumber, SELECTED_LANGUAGE),
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
  }, [dayNumber]);

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  const playPreviewAudio = async (entry: VocabularyEntry) => {
    if (!entry.ttsStoragePath) {
      toast({
        title: "Audio unavailable",
        description: "This word does not have an audio sample yet.",
        variant: "destructive",
      });
      return;
    }

    const audioId = `${entry.word}-${entry.translation}`;
    setLoadingAudioId(audioId);

    try {
      const candidateUrls = resolveAudioUrls(entry.ttsStoragePath, {
        lessonDayNumber: dayNumber,
      });

      if (candidateUrls.length === 0) {
        throw new Error("Missing audio URL");
      }

      let played = false;
      for (const publicUrl of candidateUrls) {
        try {
          const headResponse = await fetch(publicUrl, { method: "HEAD" });
          if (!headResponse.ok) {
            continue;
          }

          if (currentAudio) {
            currentAudio.pause();
          }

          const audio = new Audio(publicUrl);
          await audio.play();
          setCurrentAudio(audio);
          audio.onended = () => setCurrentAudio(null);
          played = true;
          break;
        } catch {
          continue;
        }
      }

      if (!played) {
        throw new Error("Unable to play audio");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Playback error",
        description: "Unable to play this audio right now.",
        variant: "destructive",
      });
    } finally {
      setLoadingAudioId(null);
    }
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
  const currentScenario = dailyScenarios[SELECTED_LANGUAGE];
  const vocabCount = dailyVocab.length;
  const audioPreviewWords = dailyVocab
    .filter((entry) => Boolean(entry.ttsStoragePath))
    .slice(0, 6);

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

        <section className="rounded-3xl border border-teal-700/20 bg-gradient-to-br from-teal-700 via-emerald-600 to-cyan-500 p-6 text-primary-foreground shadow-card dark:border-teal-400/20 dark:from-teal-800 dark:via-emerald-700 dark:to-cyan-700">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary-foreground/75">
              Listen First
            </p>
            <h2 className="text-3xl font-bold">Tap today&apos;s words</h2>
            <p className="max-w-2xl text-sm text-primary-foreground/85">
              Hear the pronunciation before you start the flash challenge. These are today&apos;s
              Cantonese words with instant playback.
            </p>
          </div>

          {audioPreviewWords.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {audioPreviewWords.map((entry) => {
                const audioId = `${entry.word}-${entry.translation}`;
                const isLoading = loadingAudioId === audioId;

                return (
                  <button
                    key={audioId}
                    type="button"
                    onClick={() => playPreviewAudio(entry)}
                    className="rounded-2xl border border-white/20 bg-white/12 p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-white/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-2xl font-bold">{entry.word}</div>
                        {entry.romanization && (
                          <div className="text-sm text-primary-foreground/75">{entry.romanization}</div>
                        )}
                        <div className="text-sm font-medium text-primary-foreground/90">
                          {entry.translation}
                        </div>
                      </div>
                      <div className="rounded-full bg-white/18 p-2">
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/30 p-4 text-sm text-primary-foreground/80">
              Audio clips for today&apos;s words are not available yet.
            </div>
          )}
        </section>

        <Button
          size="lg"
          className="w-full h-auto py-8 bg-teal-800 text-primary-foreground hover:opacity-90 shadow-card-hover dark:bg-teal-900/80 dark:text-primary-foreground dark:border dark:border-primary/30"
          onClick={() => navigate("/vocabulary-quiz")}
        >
          <div className="text-center space-y-1">
            <div className="text-sm font-medium opacity-90">Cantonese Vocabulary</div>
            <div className="text-lg font-bold">
              Daily Vocab Flash Challenge
            </div>
            <div className="text-sm opacity-75">
              {vocabCount} words to practice with audio and recall
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
