import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PatternListProps {
  title: string;
  patterns: string[];
  variant?: "default" | "warning" | "success";
}

export function PatternList({ title, patterns, variant = "default" }: PatternListProps) {
  const getBadgeVariant = () => {
    switch (variant) {
      case "warning":
        return "warning";
      case "success":
        return "success";
      default:
        return "secondary";
    }
  };

  if (patterns.length === 0) return null;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{title}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {patterns.map((pattern, index) => (
          <Badge key={index} variant={getBadgeVariant()}>
            {pattern}
          </Badge>
        ))}
      </div>
    </div>
  );
}
