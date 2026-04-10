import { Card } from "@/components/ui/card";

interface LanguageSelectorProps {
  selectedLanguage: "cantonese" | null;
  onSelect: (language: "cantonese") => void;
}

const LanguageSelector = ({ selectedLanguage, onSelect }: LanguageSelectorProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center text-foreground">Today&apos;s language focus</h2>
      <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
        <Card
          className={`p-6 cursor-pointer transition-all duration-300 hover:shadow-card-hover ${
            selectedLanguage === "cantonese"
              ? "bg-gradient-secondary border-secondary shadow-card-hover scale-105 dark:bg-card dark:border-secondary dark:shadow-card"
              : "bg-gradient-card hover:scale-102 dark:bg-card/80"
          }`}
          onClick={() => onSelect("cantonese")}
        >
          <div className="text-center space-y-3">
            <div className="text-5xl">🇭🇰</div>
            <h3 className="text-xl font-bold text-card-foreground">Cantonese</h3>
            <p className="text-sm text-muted-foreground">廣東話</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LanguageSelector;
