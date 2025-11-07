import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface ScenarioCardProps {
  title: string;
  description: string;
  yourRole: string;
  partnerRole: string;
  language: "russian" | "cantonese";
  scenarioId: string;
  onClick: () => void;
}

const ScenarioCard = ({ title, description, yourRole, partnerRole, language, onClick }: ScenarioCardProps) => {
  const roleBadgeClasses =
    "border border-border bg-background/60 text-foreground hover:bg-background/80 dark:bg-primary/40 dark:text-primary-foreground dark:border-primary/50";

  return (
    <Card
      className="p-6 shadow-card space-y-4 cursor-pointer transition-all hover:shadow-card-hover hover:scale-[1.02] bg-gradient-primary text-primary-foreground dark:bg-primary/10 dark:text-primary-foreground dark:border dark:border-primary/30"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">Today's Scenario</h3>
          <p className="text-lg opacity-90">{title}</p>
        </div>
        <Users className="w-8 h-8 opacity-80" />
      </div>

      <p className="text-sm opacity-90 leading-relaxed">{description}</p>

      <div className="text-sm opacity-75 text-center pt-2">
        Click to start the conversation
      </div>
    </Card>
  );
};

export default ScenarioCard;
