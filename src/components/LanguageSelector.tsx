import { Card } from "@/components/ui/card";

interface LanguageSelectorProps {
  selectedLanguage: "russian" | "cantonese" | null;
  onSelect: (language: "russian" | "cantonese") => void;
}

const LanguageSelector = ({ selectedLanguage, onSelect }: LanguageSelectorProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center text-foreground">Which language are you learning?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <Card
          className={`p-6 cursor-pointer transition-all duration-300 hover:shadow-card-hover ${
            selectedLanguage === "russian"
              ? "bg-gradient-primary border-primary shadow-card-hover scale-105 dark:bg-card dark:border-primary dark:shadow-card"
              : "bg-gradient-card hover:scale-102 dark:bg-card/80"
          }`}
          onClick={() => onSelect("russian")}
        >
          <div className="text-center space-y-3">
            <div className="text-5xl">🇷🇺</div>
            <h3 className="text-xl font-bold text-card-foreground">Russian</h3>
            <p className="text-sm text-muted-foreground">Русский язык</p>
          </div>
        </Card>

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
