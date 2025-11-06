import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X } from "lucide-react";

interface VocabQuestion {
  word: string;
  translation: string;
  romanization?: string;
  questionType: "toEnglish" | "fromEnglish" | "romanToEnglish";
}

const VocabularyQuiz = () => {
  const [vocabulary, setVocabulary] = useState<VocabQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [language, setLanguage] = useState<string>("");
  const [options, setOptions] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchVocabulary();
  }, []);

  useEffect(() => {
    if (vocabulary.length > 0 && currentIndex < vocabulary.length) {
      generateOptions();
    }
  }, [currentIndex, vocabulary]);

  const fetchVocabulary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("learning_language")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    setLanguage(profile.learning_language);

    const { data: vocab } = await supabase
      .from("daily_vocabulary")
      .select("word, translation, romanization")
      .eq("language", profile.learning_language)
      .eq("date", new Date().toISOString().split("T")[0])
      .limit(10);

    if (vocab) {
      const hasNonRomanAlphabet = profile.learning_language === "russian" || profile.learning_language === "cantonese";
      const questions: VocabQuestion[] = vocab.flatMap((v, index) => {
        const types: VocabQuestion[] = [
          { ...v, questionType: "toEnglish" },
          { ...v, questionType: "fromEnglish" },
        ];
        if (hasNonRomanAlphabet && v.romanization) {
          types.push({ ...v, questionType: "romanToEnglish" });
        }
        return types;
      });
      
      // Shuffle questions
      const shuffled = questions.sort(() => Math.random() - 0.5);
      setVocabulary(shuffled);
    }
  };

  const generateOptions = () => {
    const current = vocabulary[currentIndex];
    if (!current) return;

    let correctAnswer = "";
    let wrongAnswers: string[] = [];

    if (current.questionType === "toEnglish") {
      correctAnswer = current.translation;
      wrongAnswers = vocabulary
        .filter((v, i) => i !== currentIndex)
        .map(v => v.translation)
        .slice(0, 3);
    } else if (current.questionType === "fromEnglish") {
      correctAnswer = current.word;
      wrongAnswers = vocabulary
        .filter((v, i) => i !== currentIndex)
        .map(v => v.word)
        .slice(0, 3);
    } else {
      correctAnswer = current.translation;
      wrongAnswers = vocabulary
        .filter((v, i) => i !== currentIndex)
        .map(v => v.translation)
        .slice(0, 3);
    }

    const allOptions = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  };

  const getQuestion = () => {
    const current = vocabulary[currentIndex];
    if (!current) return "";

    if (current.questionType === "toEnglish") {
      return current.word;
    } else if (current.questionType === "fromEnglish") {
      return current.translation;
    } else {
      return current.romanization || current.word;
    }
  };

  const getCorrectAnswer = () => {
    const current = vocabulary[currentIndex];
    if (current.questionType === "toEnglish" || current.questionType === "romanToEnglish") {
      return current.translation;
    } else {
      return current.word;
    }
  };

  const handleAnswer = (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === getCorrectAnswer();
    if (isCorrect) {
      setScore(score + 1);
    }

    // Automatically advance to next question after 1 second
    setTimeout(() => {
      handleNext();
    }, 1000);
  };

  const handleNext = async () => {
    if (currentIndex < vocabulary.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const xpGained = score * 5;
        const { data: progress } = await supabase
          .from("user_progress")
          .select("xp")
          .eq("user_id", user.id)
          .single();

        if (progress) {
          await supabase
            .from("user_progress")
            .update({ xp: progress.xp + xpGained })
            .eq("user_id", user.id);
        }

        toast({
          title: "Quiz Complete!",
          description: `You scored ${score}/${vocabulary.length} and earned ${xpGained} XP!`,
        });
      }
      navigate("/");
    }
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
  const progress = ((currentIndex + 1) / vocabulary.length) * 100;

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
                    {current.questionType === "toEnglish" ? "Translate to English" : 
                     current.questionType === "fromEnglish" ? `Translate to ${language === "russian" ? "Russian" : "Cantonese"}` :
                     "Translate romanization to English"}
                  </p>
                  <h2 className="text-4xl font-bold text-foreground">
                    {getQuestion()}
                  </h2>
                </div>

                <div className="grid gap-3">
                  {options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === getCorrectAnswer();
                    const showCorrect = showResult && isCorrect;
                    const showWrong = showResult && isSelected && !isCorrect;

                    return (
                      <Button
                        key={index}
                        variant="outline"
                        size="lg"
                        className={`h-auto py-4 text-lg ${
                          showCorrect ? "bg-green-500/20 border-green-500" :
                          showWrong ? "bg-red-500/20 border-red-500" :
                          isSelected ? "bg-primary/10" : ""
                        }`}
                        onClick={() => handleAnswer(option)}
                        disabled={showResult}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{option}</span>
                          {showCorrect && <Check className="w-5 h-5 text-green-500" />}
                          {showWrong && <X className="w-5 h-5 text-red-500" />}
                        </div>
                      </Button>
                    );
                  })}
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VocabularyQuiz;
