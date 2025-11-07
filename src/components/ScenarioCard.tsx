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
    "border-0 bg-white/20 text-primary-foreground hover:bg-white/30 dark:bg-muted/40 dark:text-card-foreground dark:hover:bg-muted/60";

  return (
    <Card 
      className="bg-gradient-primary p-6 shadow-card text-primary-foreground space-y-4 cursor-pointer transition-all hover:shadow-card-hover hover:scale-[1.02] dark:bg-card/90 dark:text-card-foreground"
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

      <div className="flex gap-3 flex-wrap">
        <Badge variant="secondary" className={roleBadgeClasses}>
          You: {yourRole}
        </Badge>
        <Badge variant="secondary" className={roleBadgeClasses}>
          Partner: {partnerRole}
        </Badge>
      </div>

      <div className="text-sm opacity-75 text-center pt-2">
        Click to start the conversation
      </div>
    </Card>
  );
};

export default ScenarioCard;
