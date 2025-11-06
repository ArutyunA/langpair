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
  const gradientClass = language === "russian" ? "bg-gradient-primary" : "bg-gradient-secondary";
  
  return (
    <Card 
      className={`${gradientClass} p-6 shadow-card text-white space-y-4 cursor-pointer transition-all hover:shadow-card-hover hover:scale-[1.02]`}
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
        <Badge variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30">
          You: {yourRole}
        </Badge>
        <Badge variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30">
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
