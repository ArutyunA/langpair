import { Card } from "@/components/ui/card";
import { Trophy, Star, Target, Sparkles } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: "trophy" | "star" | "target" | "sparkles";
  earned: boolean;
}

interface AchievementBadgeProps {
  achievement: Achievement;
}

const AchievementBadge = ({ achievement }: AchievementBadgeProps) => {
  const icons = {
    trophy: Trophy,
    star: Star,
    target: Target,
    sparkles: Sparkles,
  };

  const Icon = icons[achievement.icon];

  return (
    <Card
      className={`p-4 transition-all duration-300 ${
        achievement.earned
          ? "bg-gradient-accent text-accent-foreground shadow-achievement hover:scale-105"
          : "bg-muted text-muted-foreground opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${achievement.earned ? "bg-white/20" : "bg-background/50"}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{achievement.title}</h4>
          <p className="text-xs opacity-90">{achievement.description}</p>
        </div>
      </div>
    </Card>
  );
};

export default AchievementBadge;
