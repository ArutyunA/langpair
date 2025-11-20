import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Volume2 } from "lucide-react";
import { DAILY_SCENARIO_SELECT, normalizeScenario, type ScenarioQueryResult } from "@/lib/scenario-utils";
import type { ScenarioContent } from "@/types/scenario";
import { markTaskCompleted } from "@/lib/task-progress";

interface PhraseState {
  showRomanization: boolean;
  showTranslation: boolean;
}

interface VocabularyEntry {
  word: string;
  translation: string;
  romanization?: string | null;
  tts_storage_path?: string | null;
}

const TTS_BUCKET = import.meta.env.VITE_TTS_BUCKET ?? "TTSCanto";
const TTS_SPEAKER_PREFIX = import.meta.env.VITE_TTS_PREFIX ?? "bethany";
const STORAGE_PUBLIC_SEGMENT = "storage/v1/object/public/";

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
        .select("word, translation, romanization, tts_storage_path")
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

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

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

    await markTaskCompleted(user.id, "scenario");

    toast({
      title: "Scenario complete!",
      description: "Great work—daily scenario task locked in.",
    });

    navigate("/");
  };

  const resolvePublicAudioUrls = (rawPath?: string | null): string[] => {
    if (!rawPath) return [];
    const trimmed = rawPath.trim();
    if (!trimmed) return [];

    if (/^https?:\/\//i.test(trimmed)) {
      return [trimmed];
    }

    const stripBucketPrefix = (value: string) => {
      let next = value.replace(/^\/+/, "");
      const storageIndex = next.toLowerCase().indexOf(STORAGE_PUBLIC_SEGMENT);
      if (storageIndex >= 0) {
        next = next.slice(storageIndex + STORAGE_PUBLIC_SEGMENT.length);
      }

      const bucketMarker = `${TTS_BUCKET}/`;
      const bucketIndex = next.indexOf(bucketMarker);
      if (bucketIndex >= 0) {
        next = next.slice(bucketIndex + bucketMarker.length);
      }

      next = next.replace(/^public\//i, "");
      if (next.startsWith(bucketMarker)) {
        next = next.slice(bucketMarker.length);
      }

      return next;
    };

    const normalized = stripBucketPrefix(trimmed);
    const normalizedParts = normalized.split("/").filter(Boolean);
    const baseFilename = normalizedParts.at(-1) ?? normalized;
    const seen = new Set<string>();
    const priorityCandidates: string[] = [];
    const fallbackCandidates: string[] = [];

    const addCandidate = (value?: string | null, priority = false) => {
      const next = value?.trim();
      if (!next || seen.has(next)) return;
      seen.add(next);
      (priority ? priorityCandidates : fallbackCandidates).push(next);
    };

    const filenameDayMatch = baseFilename.match(/(day\d{1,2})/i);
    if (filenameDayMatch) {
      const explicitDay = filenameDayMatch[1].toLowerCase();
      addCandidate(`${TTS_SPEAKER_PREFIX}/${explicitDay}/${baseFilename}`, true);
    }

    const scenarioDay = scenario ? `day${String(scenario.dayNumber).padStart(2, "0")}` : null;
    if (scenarioDay) {
      addCandidate(`${TTS_SPEAKER_PREFIX}/${scenarioDay}/${baseFilename}`, true);
    }

    const prefixedNormalized = normalized.startsWith(`${TTS_SPEAKER_PREFIX}/`)
      ? normalized
      : `${TTS_SPEAKER_PREFIX}/${normalized}`;
    addCandidate(prefixedNormalized, false);
    addCandidate(normalized, false);

    const candidates = [...priorityCandidates, ...fallbackCandidates];

    const urls: string[] = [];
    for (const candidate of candidates) {
      const { data } = supabase.storage.from(TTS_BUCKET).getPublicUrl(candidate);
      if (data.publicUrl) {
        urls.push(data.publicUrl);
      }
    }
    return urls;
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
      const candidateUrls = resolvePublicAudioUrls(path);
      if (candidateUrls.length === 0) {
        throw new Error("Missing public URL");
      }

      let played = false;
      for (const publicUrl of candidateUrls) {
        try {
          const headResponse = await fetch(publicUrl, { method: "HEAD" });
          if (!headResponse.ok) {
            if (import.meta.env.DEV) {
              console.warn("Audio HEAD check failed", publicUrl, headResponse.status);
            }
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
        } catch (candidateErr) {
          if (import.meta.env.DEV) {
            console.warn("Audio candidate failed", candidateErr);
          }
        }
      }

      if (!played) {
        throw new Error("Unable to play any audio source");
      }
    } catch (err) {
      console.error(err);
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
                      {vocabHighlights.map((entry, index) => {
                        const id = `vocab-${entry.word}-${index}`;
                        return (
                          <div key={id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 gap-3">
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">{entry.word}</p>
                              {showRomanization && entry.romanization && (
                                <p className="text-xs text-muted-foreground">{entry.romanization}</p>
                              )}
                              <p className="text-sm text-muted-foreground">{entry.translation}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Play audio for ${entry.word}`}
                              onClick={() => playAudio(id, entry.tts_storage_path)}
                              disabled={loadingAudioId === id}
                            >
                              {loadingAudioId === id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Volume2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
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
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-muted-foreground uppercase">
                          {isYourLine ? scenario.yourRole : scenario.partnerRole}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Play phrase audio"
                          onClick={(event) => {
                            event.stopPropagation();
                            playAudio(`phrase-${phrase.id}`, phrase.ttsStoragePath);
                          }}
                          disabled={loadingAudioId === `phrase-${phrase.id}`}
                        >
                          {loadingAudioId === `phrase-${phrase.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </Button>
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
