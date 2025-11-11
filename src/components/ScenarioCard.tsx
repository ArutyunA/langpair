import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

interface ScenarioCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

const ScenarioCard = ({ title, description, onClick }: ScenarioCardProps) => {
  return (
    <Card
      className="p-6 shadow-card space-y-4 cursor-pointer transition-all hover:shadow-card-hover hover:scale-[1.02] bg-teal-800 text-primary-foreground dark:bg-teal-900/80 dark:text-primary-foreground dark:border dark:border-primary/30 text-center"
      onClick={onClick}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium opacity-90">Today's scenario</p>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <Users className="w-8 h-8 opacity-80 mx-auto" />
      <p className="text-sm opacity-90 leading-relaxed">{description}</p>
    </Card>
  );
};

export default ScenarioCard;
