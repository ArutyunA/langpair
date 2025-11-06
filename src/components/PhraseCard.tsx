import { Card } from "@/components/ui/card";
import { Volume2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PhraseCardProps {
  phrase: string;
  translation: string;
  romanization?: string;
  onComplete?: () => void;
}

const PhraseCard = ({ phrase, translation, romanization, onComplete }: PhraseCardProps) => {
  const [isCompleted, setIsCompleted] = useState(false);

  const handleComplete = () => {
    setIsCompleted(true);
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Card className={`p-4 bg-gradient-card shadow-card hover:shadow-card-hover transition-all duration-300 ${
      isCompleted ? "border-success" : ""
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <p className="text-2xl font-semibold text-foreground">{phrase}</p>
          {romanization && (
            <p className="text-sm text-muted-foreground italic">{romanization}</p>
          )}
          <p className="text-base text-muted-foreground">{translation}</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-primary/10 hover:text-primary"
            onClick={() => {
              // Placeholder for text-to-speech
              console.log("Playing audio for:", phrase);
            }}
          >
            <Volume2 className="w-5 h-5" />
          </Button>
          
          <Button
            size="icon"
            variant={isCompleted ? "default" : "outline"}
            className={isCompleted ? "bg-success hover:bg-success/90" : ""}
            onClick={handleComplete}
          >
            <Check className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PhraseCard;
