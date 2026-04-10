import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Loader2, Volume2, X } from "lucide-react";
import { getCurrentLessonDay } from "@/lib/daily-cycle";
import { markTaskCompleted } from "@/lib/task-progress";
import { fetchDailyVocabulary, type Language } from "@/lib/api";
import { getLanguagePreference } from "@/lib/preferences";
import { resolveAudioUrls } from "@/lib/audio";

const MAX_QUESTIONS = 20;
const DONT_KNOW_OPTION = "Don't know";

interface VocabQuestion {
  word: string;
  translation: string;
  romanization?: string | null;
  questionType: "toEnglish" | "fromEnglish";
  attempts?: number;
  incorrect?: number;
  options: string[];
  ttsStoragePath?: string | null;
}

const VocabularyQuiz = () => {
  const [vocabulary, setVocabulary] = useState<VocabQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [language, setLanguage] = useState<Language | "">("");
  const [loading, setLoading] = useState(true);
  const [showQuestionRomanization, setShowQuestionRomanization] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [autoPlayedQuestionIndex, setAutoPlayedQuestionIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const dayNumber = getCurrentLessonDay();
  const romanizationLookup = useMemo(() => {
    const map = new Map<string, string>();
    vocabulary.forEach((entry) => {
      if (entry.word) {
        map.set(entry.word, entry.romanization ?? "");
      }
    });
    return map;
  }, [vocabulary]);

  useEffect(() => {
    const loadVocabulary = async () => {
      setLoading(true);
      const languagePreference = getLanguagePreference();
      if (!languagePreference) {
        navigate("/");
        return;
      }

      try {
        setLanguage(languagePreference);
        const vocab = await fetchDailyVocabulary(dayNumber, languagePreference);

        const source = vocab.slice(0, 10).map((entry) => ({
          ...entry,
          ttsStoragePath: entry.ttsStoragePath,
        }));

        if (source.length === 0) {
          setVocabulary([]);
          return;
        }

        const questions: VocabQuestion[] = [];
        source.forEach((entry) => {
          ["toEnglish", "fromEnglish"]
            .sort(() => Math.random() - 0.5)
            .forEach((type) =>
              questions.push({
                ...entry,
                questionType: type as VocabQuestion["questionType"],
                attempts: 0,
                incorrect: 0,
                options: [],
                ttsStoragePath: entry.ttsStoragePath,
              }),
            );
        });

        const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, MAX_QUESTIONS);
        const enriched = shuffled.map((question) => ({
          ...question,
          options: buildQuestionOptions(question, shuffled),
        }));
        setVocabulary(enriched);
        setCurrentIndex(0);
        setScore(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setShowQuestionRomanization(false);
        setAutoPlayedQuestionIndex(null);
      } finally {
        setLoading(false);
      }
    };

    loadVocabulary();
  }, [dayNumber, navigate]);

  const buildPoolByType = (
    questionsList: VocabQuestion[],
    type: VocabQuestion["questionType"],
  ) => questionsList
    .map((value) => (type === "fromEnglish" ? value.word : value.translation))
    .filter((value): value is string => Boolean(value));

  const buildWrongAnswers = (
    correctAnswer: string,
    pool: string[],
  ) => {
    const unique = Array.from(new Set(pool.filter((value) => value !== correctAnswer)));
    const shuffled = unique.sort(() => Math.random() - 0.5);
    const wrongs: string[] = [];

    for (const option of shuffled) {
      if (wrongs.length === 3) break;
      wrongs.push(option);
    }

    if (wrongs.length < 3) {
      while (wrongs.length < 3 && pool.length > 0) {
        const candidate = pool[Math.floor(Math.random() * pool.length)];
        if (candidate !== correctAnswer && !wrongs.includes(candidate)) {
          wrongs.push(candidate);
        } else if (pool.length === 1) {
          break;
        }
      }
    }

    return wrongs;
  };

  const buildQuestionOptions = (
    question: VocabQuestion,
    questionsList: VocabQuestion[],
  ) => {
    const correctAnswer =
      question.questionType === "fromEnglish" ? question.word : question.translation;
    const pool = buildPoolByType(questionsList, question.questionType);
    const wrongAnswers = buildWrongAnswers(correctAnswer, pool);

    const optionSet = new Set<string>([correctAnswer, ...wrongAnswers]);
    const uniquePool = Array.from(new Set(pool.filter((value) => value !== correctAnswer)));
    while (optionSet.size < 4 && uniquePool.length > 0) {
      const candidate = uniquePool[Math.floor(Math.random() * uniquePool.length)];
      optionSet.add(candidate);
    }
    const fallbackPool = pool.filter((value) => value !== correctAnswer);
    while (optionSet.size < 4 && fallbackPool.length > 0) {
      const candidate = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
      optionSet.add(candidate);
    }

    const actualOptions = Array.from(optionSet).sort(() => Math.random() - 0.5);
    if (!actualOptions.includes(DONT_KNOW_OPTION)) {
      actualOptions.push(DONT_KNOW_OPTION);
    }
    return actualOptions;
  };

  const getQuestion = () => {
    const current = vocabulary[currentIndex];
    if (!current) return "";
    return current.questionType === "toEnglish" ? current.word : current.translation;
  };

  const getCorrectAnswer = () => {
    const current = vocabulary[currentIndex];
    return current.questionType === "toEnglish" ? current.translation : current.word;
  };

  const recordAttempt = (questionIndex: number, isCorrect: boolean) => {
    setVocabulary((prev) => {
      const clone = [...prev];
      const entry = { ...clone[questionIndex] };
      entry.attempts = (entry.attempts ?? 0) + 1;
      if (!isCorrect) {
        entry.incorrect = (entry.incorrect ?? 0) + 1;
      }
      clone[questionIndex] = entry;
      return clone;
    });
  };

  const handleSkip = () => {
    if (showResult) return;
    recordAttempt(currentIndex, false);
    setShowQuestionRomanization(false);
    handleNext();
  };

  const handleAnswer = (answer: string) => {
    if (answer === DONT_KNOW_OPTION) {
      handleSkip();
      return;
    }

    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);
    setAutoPlayedQuestionIndex(null);

    const isCorrect = answer === getCorrectAnswer();
    recordAttempt(currentIndex, isCorrect);
    if (isCorrect) {
      setScore((current) => current + 1);
    }
    setShowQuestionRomanization(false);
  };

  const handleNext = async () => {
    setAutoPlayedQuestionIndex(null);
    if (currentIndex < vocabulary.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowQuestionRomanization(false);
      return;
    }

    await markTaskCompleted("vocab");

    const sortedPerformance = [...vocabulary].sort((left, right) => {
      const incorrectLeft = left.incorrect ?? 0;
      const incorrectRight = right.incorrect ?? 0;
      if (incorrectLeft === incorrectRight) {
        const attemptsLeft = left.attempts ?? 0;
        const attemptsRight = right.attempts ?? 0;
        return attemptsRight - attemptsLeft;
      }
      return incorrectRight - incorrectLeft;
    });

    const summaryLines = sortedPerformance
      .filter((entry) => (entry.attempts ?? 0) > 0)
      .slice(0, 10)
      .map((entry) => {
        const attempts = entry.attempts ?? 0;
        const incorrect = entry.incorrect ?? 0;
        return `${entry.word} / ${entry.translation} — ${incorrect}/${attempts} incorrect`;
      })
      .join("\n");

    toast({
      title: "Quiz complete!",
      description: `Score: ${score}/${vocabulary.length} (${Math.round((score / vocabulary.length) * 100)}%)\n${summaryLines}`,
    });

    setTimeout(() => navigate("/"), 500);
  };

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [currentAudio]);

  const resolvePublicAudioUrls = useCallback(
    (rawPath?: string | null) => resolveAudioUrls(rawPath, { lessonDayNumber: dayNumber }),
    [dayNumber],
  );

  const playAudio = useCallback(async (targetId: string, path?: string | null) => {
    if (!path) {
      return;
    }

    const candidateUrls = resolvePublicAudioUrls(path);
    if (candidateUrls.length === 0) {
      return;
    }

    setLoadingAudioId(targetId);
    try {
      for (const url of candidateUrls) {
        try {
          const headResponse = await fetch(url, { method: "HEAD" });
          if (!headResponse.ok) {
            continue;
          }

          if (currentAudio) {
            currentAudio.pause();
          }

          const audio = new Audio(url);
          await audio.play();
          setCurrentAudio(audio);
          audio.onended = () => setCurrentAudio(null);
          break;
        } catch (_error) {
          continue;
        }
      }
    } finally {
      setLoadingAudioId(null);
    }
  }, [currentAudio, resolvePublicAudioUrls]);

  const current = vocabulary[currentIndex];

  useEffect(() => {
    if (
      showResult &&
      language === "cantonese" &&
      current?.questionType === "fromEnglish" &&
      current?.ttsStoragePath &&
      autoPlayedQuestionIndex !== currentIndex
    ) {
      setAutoPlayedQuestionIndex(currentIndex);
      playAudio(`option-${currentIndex}`, current.ttsStoragePath);
    }
  }, [
    autoPlayedQuestionIndex,
    current?.questionType,
    current?.ttsStoragePath,
    currentIndex,
    language,
    playAudio,
    showResult,
  ]);

  if (loading || vocabulary.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {loading ? "Loading quiz..." : "No quiz data for today."}
          </div>
        </div>
      </div>
    );
  }

  const currentOptions = current?.options ?? [];
  const progress = ((currentIndex + 1) / vocabulary.length) * 100;

  const canRevealQuestionRomanization =
    language === "cantonese" &&
    current?.questionType === "toEnglish" &&
    Boolean(current?.romanization);

  const showOptionRomanization =
    language === "cantonese" &&
    current?.questionType === "fromEnglish" &&
    showResult;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Daily Vocab Flash Challenge
          </h1>
          <div className="text-sm font-medium text-muted-foreground">
            {score}/{currentIndex + (showResult ? 1 : 0)}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {currentIndex + 1} of {vocabulary.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <Card className="border-2">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {current.questionType === "toEnglish"
                      ? "Translate to English"
                      : `Translate to ${language === "russian" ? "Russian" : "Cantonese"}`}
                  </p>
                  <div className="space-y-2">
                    <h2
                      className={`text-4xl font-bold text-foreground ${
                        canRevealQuestionRomanization ? "cursor-pointer" : ""
                      }`}
                      onClick={() => {
                        if (canRevealQuestionRomanization) {
                          setShowQuestionRomanization((value) => !value);
                        }
                      }}
                    >
                      {getQuestion()}
                    </h2>
                    {language === "cantonese" && current.questionType === "toEnglish" && current.ttsStoragePath && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mx-auto"
                        onClick={() => playAudio(`question-${currentIndex}`, current.ttsStoragePath)}
                      >
                        {loadingAudioId === `question-${currentIndex}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {canRevealQuestionRomanization && showQuestionRomanization && current.romanization && (
                      <p className="text-lg text-muted-foreground">{current.romanization}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3">
                  {currentOptions.map((option) => {
                    const isCorrect = option === getCorrectAnswer();
                    const isSelected = selectedAnswer === option;
                    const optionRomanization =
                      showOptionRomanization && option !== DONT_KNOW_OPTION
                        ? romanizationLookup.get(option)
                        : null;

                    return (
                      <Button
                        key={option}
                        variant="outline"
                        className={`h-auto min-h-16 justify-between px-4 py-4 whitespace-normal ${
                          showResult && isCorrect
                            ? "border-green-500 bg-green-500/10"
                            : showResult && isSelected
                              ? "border-red-500 bg-red-500/10"
                              : ""
                        }`}
                        onClick={() => handleAnswer(option)}
                        disabled={showResult}
                      >
                        <div className="flex-1 text-left">
                          <div className="font-medium">{option}</div>
                          {optionRomanization && (
                            <div className="text-sm text-muted-foreground mt-1">{optionRomanization}</div>
                          )}
                        </div>
                        {showResult && isCorrect && <Check className="w-4 h-4 text-green-600" />}
                        {showResult && isSelected && !isCorrect && <X className="w-4 h-4 text-red-600" />}
                      </Button>
                    );
                  })}
                </div>

                {showResult ? (
                  <Button onClick={handleNext} className="w-full">
                    {currentIndex === vocabulary.length - 1 ? "Finish" : "Next Question"}
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={handleSkip} className="w-full">
                    Skip
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VocabularyQuiz;
