import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X } from "lucide-react";
import { getCurrentLessonDay } from "@/lib/daily-cycle";
import { markTaskCompleted } from "@/lib/task-progress";

const MAX_QUESTIONS = 20;
const DONT_KNOW_OPTION = "Don't know";

interface VocabQuestion {
  word: string;
  translation: string;
  romanization?: string;
  questionType: "toEnglish" | "fromEnglish";
  attempts?: number;
  incorrect?: number;
  options: string[];
}

const VocabularyQuiz = () => {
  const [vocabulary, setVocabulary] = useState<VocabQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [language, setLanguage] = useState<string>("");
  const [showQuestionRomanization, setShowQuestionRomanization] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const dayNumber = getCurrentLessonDay();
  const romanizationLookup = useMemo(() => {
    const map = new Map<string, string>();
    vocabulary.forEach(entry => {
      if (entry.word) {
        map.set(entry.word, entry.romanization ?? "");
      }
    });
    return map;
  }, [vocabulary]);

  useEffect(() => {
    fetchVocabulary();
  }, [dayNumber]);

  const fetchVocabulary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("learning_language")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    const languagePreference = (profile.learning_language as "russian" | "cantonese") ?? "russian";
    setLanguage(languagePreference);

    const { data: vocab } = await supabase
      .from("daily_vocabulary")
      .select("word, translation, romanization")
      .eq("language", profile.learning_language)
      .eq("day_number", dayNumber)
      .limit(10);

    const source = (vocab ?? []).slice(0, 10);

    if (source.length === 0) {
      setVocabulary([]);
      return;
    }

    const questions: VocabQuestion[] = [];

    source.forEach(entry => {
      const availableTypes: VocabQuestion["questionType"][] = ["toEnglish", "fromEnglish"];
      availableTypes
        .sort(() => Math.random() - 0.5)
        .forEach(type =>
          questions.push({
            ...entry,
            questionType: type,
            attempts: 0,
            incorrect: 0,
            options: [],
          }),
        );
    });

    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, MAX_QUESTIONS);
    const enriched = shuffled.map(question => ({
      ...question,
      options: buildQuestionOptions(question, shuffled),
    }));
    setVocabulary(enriched);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowQuestionRomanization(false);
  };

  const buildPoolByType = (
    questionsList: VocabQuestion[],
    type: VocabQuestion["questionType"],
  ) => {
    return questionsList
      .map(v => (type === "fromEnglish" ? v.word : v.translation))
      .filter((value): value is string => Boolean(value));
  };

  const buildWrongAnswers = (
    correctAnswer: string,
    pool: string[],
  ) => {
    const unique = Array.from(new Set(pool.filter(value => value !== correctAnswer)));
    const shuffled = unique.sort(() => Math.random() - 0.5);
    const wrongs: string[] = [];

    for (const option of shuffled) {
      if (wrongs.length === 3) break;
      wrongs.push(option);
    }

    // Fallback: if there still aren't enough unique options, reuse pool entries
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
    const uniquePool = Array.from(new Set(pool.filter(value => value !== correctAnswer)));
    while (optionSet.size < 4 && uniquePool.length > 0) {
      const candidate = uniquePool[Math.floor(Math.random() * uniquePool.length)];
      optionSet.add(candidate);
    }
    const fallbackPool = pool.filter(value => value !== correctAnswer);
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

    if (current.questionType === "toEnglish") {
      return current.word;
    } else if (current.questionType === "fromEnglish") {
      return current.translation;
    } else {
      return current.word;
    }
  };

  const getCorrectAnswer = () => {
    const current = vocabulary[currentIndex];
    if (current.questionType === "toEnglish") {
      return current.translation;
    } else {
      return current.word;
    }
  };

  const recordAttempt = (questionIndex: number, isCorrect: boolean) => {
    setVocabulary(prev => {
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

    const isCorrect = answer === getCorrectAnswer();
    recordAttempt(currentIndex, isCorrect);
    if (isCorrect) {
      setScore(score + 1);
    }
    setShowQuestionRomanization(false);
  };

  const handleNext = async () => {
    if (currentIndex < vocabulary.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowQuestionRomanization(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await markTaskCompleted(user.id, "vocab");
    }

    const sortedPerformance = [...vocabulary].sort((a, b) => {
      const incorrectA = a.incorrect ?? 0;
      const incorrectB = b.incorrect ?? 0;
      if (incorrectA === incorrectB) {
        const attemptsA = a.attempts ?? 0;
        const attemptsB = b.attempts ?? 0;
        return attemptsB - attemptsA;
      }
      return incorrectB - incorrectA;
    });

    const summaryLines = sortedPerformance
      .filter(entry => (entry.attempts ?? 0) > 0)
      .slice(0, 10)
      .map(entry => {
        const attempts = entry.attempts ?? 0;
        const incorrect = entry.incorrect ?? 0;
        return `${entry.word} / ${entry.translation} — ${incorrect}/${attempts} incorrect`;
      })
      .join("\\n");

    toast({
      title: "Quiz complete!",
      description: `Score: ${score}/${vocabulary.length} (${Math.round((score / vocabulary.length) * 100)}%)\\n${summaryLines}`,
    });

    setTimeout(() => navigate("/"), 500);
  };

  if (vocabulary.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Loading quiz...
          </div>
        </div>
      </div>
    );
  }

  const current = vocabulary[currentIndex];
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
                          setShowQuestionRomanization(prev => !prev);
                        }
                      }}
                    >
                      {getQuestion()}
                    </h2>
                    {canRevealQuestionRomanization && showQuestionRomanization && current.romanization && (
                      <p className="text-lg text-muted-foreground">{current.romanization}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3">
                  {currentOptions.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === getCorrectAnswer();
                    const showCorrect = showResult && isCorrect;
                    const showWrong = showResult && isSelected && !isCorrect;
                    const isSkip = option === DONT_KNOW_OPTION;

                    return (
                      <Button
                        key={index}
                        variant="outline"
                        size="lg"
                        className={`h-auto py-4 text-lg ${
                          showCorrect ? "bg-green-500/20 border-green-500" :
                          showWrong ? "bg-red-500/20 border-red-500" :
                          isSelected && !isSkip ? "bg-primary/10" : ""
                        } ${isSkip ? "justify-center w-1/2 mx-auto text-muted-foreground italic bg-muted/40 border-dashed" : ""}`}
                        onClick={() => handleAnswer(option)}
                        disabled={showResult}
                      >
                        <div className="w-full flex flex-col items-center gap-1">
                          <span className={isSkip ? "italic" : ""}>{option}</span>
                          {showOptionRomanization && !isSkip && (
                            <span className="text-sm text-muted-foreground">
                              {romanizationLookup.get(option) ?? ""}
                            </span>
                          )}
                          <div className="flex gap-2">
                            {showCorrect && <Check className="w-5 h-5 text-green-500" />}
                            {showWrong && <X className="w-5 h-5 text-red-500" />}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
                {showResult && (
                  <Button className="w-full mt-4" onClick={handleNext}>
                    Continue
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
