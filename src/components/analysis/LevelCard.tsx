import { Target, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelCardProps {
  type: "support" | "resistance" | "sl" | "tp";
  levels: string[];
}

export function LevelCard({ type, levels }: LevelCardProps) {
  const config = {
    support: {
      title: "Support Levels",
      icon: TrendingDown,
      color: "text-chart-up",
      bg: "bg-chart-up/10",
      border: "border-chart-up/30",
    },
    resistance: {
      title: "Resistance Levels",
      icon: Target,
      color: "text-chart-down",
      bg: "bg-chart-down/10",
      border: "border-chart-down/30",
    },
    sl: {
      title: "Stop Loss",
      icon: Target,
      color: "text-chart-down",
      bg: "bg-chart-down/10",
      border: "border-chart-down/30",
    },
    tp: {
      title: "Take Profit",
      icon: Target,
      color: "text-chart-up",
      bg: "bg-chart-up/10",
      border: "border-chart-up/30",
    },
  };

  const { title, icon: Icon, color, bg, border } = config[type];

  return (
    <div className={cn("glass-card p-4 space-y-3 border", border)}>
      <div className="flex items-center gap-2">
        <div className={cn("p-2 rounded-lg", bg)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <span className="text-sm font-semibold">{title}</span>
      </div>

      <div className="space-y-2">
        {levels.map((level, index) => (
          <div
            key={index}
            className={cn(
              "px-3 py-2 rounded-lg font-mono text-sm",
              bg
            )}
          >
            <span className={color}>{level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
