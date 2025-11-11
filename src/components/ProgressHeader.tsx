import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Flame } from "lucide-react";

interface ProgressHeaderProps {
  streak: number;
  completedTasks: number;
  totalTasks: number;
}

const ProgressHeader = ({ streak, completedTasks, totalTasks }: ProgressHeaderProps) => {
  const progress = Math.min((completedTasks / totalTasks) * 100, 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Badge
          variant="outline"
          className="bg-gradient-secondary text-secondary-foreground border-0 px-4 py-2 shadow-card dark:bg-card/80 dark:text-card-foreground dark:border dark:border-border"
        >
          <Flame className="w-4 h-4 mr-2" />
          <span className="font-bold">{streak} day streak</span>
        </Badge>

        <Badge
          variant="outline"
          className="bg-gradient-accent text-accent-foreground border-0 px-4 py-2 shadow-card dark:bg-card/80 dark:text-card-foreground dark:border dark:border-border"
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          <span className="font-bold">
            {completedTasks}/{totalTasks} tasks
          </span>
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Daily tasks</span>
          <span className="font-semibold text-foreground">
            {completedTasks} / {totalTasks} complete
          </span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>
    </div>
  );
};

export default ProgressHeader;
