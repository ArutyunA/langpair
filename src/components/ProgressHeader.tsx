import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Zap } from "lucide-react";

interface ProgressHeaderProps {
  streak: number;
  xp: number;
  dailyGoal: number;
}

const ProgressHeader = ({ streak, xp, dailyGoal }: ProgressHeaderProps) => {
  const progress = Math.min((xp / dailyGoal) * 100, 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Badge 
          variant="outline" 
          className="bg-gradient-secondary text-secondary-foreground border-0 px-4 py-2 shadow-card"
        >
          <Flame className="w-4 h-4 mr-2" />
          <span className="font-bold">{streak} day streak</span>
        </Badge>

        <Badge 
          variant="outline" 
          className="bg-gradient-accent text-accent-foreground border-0 px-4 py-2 shadow-card"
        >
          <Zap className="w-4 h-4 mr-2" />
          <span className="font-bold">{xp} XP</span>
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Daily goal</span>
          <span className="font-semibold text-foreground">{xp} / {dailyGoal} XP</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>
    </div>
  );
};

export default ProgressHeader;
