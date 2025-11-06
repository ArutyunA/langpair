import { Card, CardContent } from "@/components/ui/card";

interface VocabularyCardProps {
  word: string;
  translation: string;
  romanization?: string;
}

const VocabularyCard = ({ word, translation, romanization }: VocabularyCardProps) => {
  return (
    <Card className="hover:shadow-elegant transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold text-primary">{word}</div>
          {romanization && (
            <div className="text-sm text-muted-foreground italic">{romanization}</div>
          )}
          <div className="text-lg text-foreground">{translation}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VocabularyCard;
