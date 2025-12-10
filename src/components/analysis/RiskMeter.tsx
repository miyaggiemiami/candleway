import { AlertTriangle, Shield, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskMeterProps {
  riskScore: number;
}

export function RiskMeter({ riskScore }: RiskMeterProps) {
  const getRiskLevel = () => {
    if (riskScore <= 3) return { label: "Low Risk", color: "text-chart-up", bg: "bg-chart-up" };
    if (riskScore <= 6) return { label: "Medium Risk", color: "text-warning", bg: "bg-warning" };
    return { label: "High Risk", color: "text-chart-down", bg: "bg-chart-down" };
  };

  const risk = getRiskLevel();

  const getIcon = () => {
    if (riskScore <= 3) return <Shield className="h-5 w-5" />;
    if (riskScore <= 6) return <AlertTriangle className="h-5 w-5" />;
    return <ShieldAlert className="h-5 w-5" />;
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Risk Score</span>
        <div className={cn("flex items-center gap-2", risk.color)}>
          {getIcon()}
          <span className="font-semibold">{risk.label}</span>
        </div>
      </div>

      <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-1000",
            risk.bg
          )}
          style={{ width: `${riskScore * 10}%` }}
        />
        {/* Tick marks */}
        <div className="absolute inset-0 flex justify-between px-[5%]">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-0.5 h-full bg-background/30" />
          ))}
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}
