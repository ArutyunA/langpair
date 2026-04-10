import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Volume2 } from "lucide-react";
import type { ScenarioContent } from "@/types/scenario";
import { markTaskCompleted } from "@/lib/task-progress";
import { fetchScenarioDetail, type VocabularyEntry } from "@/lib/api";
import { resolveAudioUrls } from "@/lib/audio";

interface PhraseState {
  showRomanization: boolean;
  showTranslation: boolean;
}

const ScenarioDetail = () => {
  const { scenarioId } = useParams();
  const [scenario, setScenario] = useState<ScenarioContent | null>(null);
  const [phraseStates, setPhraseStates] = useState<PhraseState[]>([]);
  const [loadingScenario, setLoadingScenario] = useState(true);
  const [vocabHighlights, setVocabHighlights] = useState<VocabularyEntry[]>([]);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadScenario = async () => {
      if (!scenarioId) return;

      try {
        const detail = await fetchScenarioDetail(scenarioId);
        setScenario(detail.scenario);
        setVocabHighlights(detail.vocabHighlights);
        setPhraseStates(
          detail.scenario.phrases.map(() => ({ showRomanization: false, showTranslation: false })),
        );
      } catch (error) {
        console.error("Error loading scenario", error);
      } finally {
        setLoadingScenario(false);
      }
    };

    loadScenario();
  }, [scenarioId]);

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

  const handlePhraseClick = (index: number) => {
    setPhraseStates((prev) => {
      const next = [...prev];
      const current = next[index];

      if (!current.showRomanization && !current.showTranslation) {
        next[index] = { showRomanization: true, showTranslation: false };
      } else if (current.showRomanization && !current.showTranslation) {
        next[index] = { showRomanization: true, showTranslation: true };
      } else {
        next[index] = { showRomanization: false, showTranslation: false };
      }

      return next;
    });
  };

  const handleCompleteScenario = async () => {
    await markTaskCompleted("scenario");

    toast({
      title: "Scenario complete!",
      description: "Great work—daily scenario task locked in.",
    });

    navigate("/");
  };

  const playAudio = async (id: string, path?: string | null) => {
    if (!path) {
      toast({
        title: "Audio unavailable",
        description: "This item doesn't have an audio sample yet.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingAudioId(id);
      const candidateUrls = resolveAudioUrls(path, {
        scenarioDayNumber: scenario?.dayNumber,
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
        } catch (_candidateError) {
          continue;
        }
      }

      if (!played) {
        throw new Error("Unable to play any audio source");
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

  if (loadingScenario || !scenario || phraseStates.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Loading scenario...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Daily Scenario
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            Day {scenario.dayNumber} • {scenario.language === "russian" ? "Russian" : "Cantonese"}
          </div>
          <h1 className="text-4xl font-bold text-foreground">{scenario.title}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{scenario.description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-2 bg-primary/5">
            <CardContent className="p-6 text-center space-y-2">
              <h3 className="font-semibold text-primary">Your Role</h3>
              <p className="text-foreground">{scenario.yourRole}</p>
            </CardContent>
          </Card>
          <Card className="border-2 bg-secondary/10">
            <CardContent className="p-6 text-center space-y-2">
              <h3 className="font-semibold text-secondary">Partner Role</h3>
              <p className="text-foreground">{scenario.partnerRole}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Practice Dialogue</h2>
              <p className="text-muted-foreground">
                Tap each phrase to reveal romanization first, then translation.
              </p>
            </div>

            <div className="space-y-4">
              {scenario.phrases.map((phrase, index) => {
                const state = phraseStates[index];
                const audioId = `phrase-${phrase.id}`;
                return (
                  <div
                    key={phrase.id}
                    className="rounded-xl border border-border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handlePhraseClick(index)}
                        className="flex-1 text-left space-y-2"
                      >
                        <div className="text-lg font-semibold text-foreground">{phrase.phrase}</div>
                        {state.showRomanization && phrase.romanization && (
                          <div className="text-sm text-muted-foreground">{phrase.romanization}</div>
                        )}
                        {state.showTranslation && (
                          <div className="text-sm font-medium text-primary">{phrase.translation}</div>
                        )}
                      </button>
                      {phrase.ttsStoragePath && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => playAudio(audioId, phrase.ttsStoragePath)}
                        >
                          {loadingAudioId === audioId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-8 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Conversation Prompts</h2>
            <div className="space-y-3">
              {scenario.prompts.map((prompt) => (
                <div key={prompt.id} className="rounded-lg bg-muted/40 px-4 py-3 text-foreground">
                  {prompt.prompt}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-8 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Vocabulary Highlights</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {vocabHighlights.map((entry) => {
                const audioId = `vocab-${entry.word}`;
                return (
                  <div key={`${entry.word}-${entry.translation}`} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground">{entry.word}</div>
                        {entry.romanization && (
                          <div className="text-sm text-muted-foreground">{entry.romanization}</div>
                        )}
                        <div className="text-sm text-primary">{entry.translation}</div>
                      </div>
                      {entry.ttsStoragePath && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => playAudio(audioId, entry.ttsStoragePath)}
                        >
                          {loadingAudioId === audioId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={handleCompleteScenario}>
          Mark Scenario Complete
        </Button>
      </main>
    </div>
  );
};

export default ScenarioDetail;
