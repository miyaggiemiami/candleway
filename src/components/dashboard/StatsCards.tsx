import { TrendingUp, Target, Activity, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
}

function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="p-2 rounded-lg bg-primary/10">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold font-mono">{value}</span>
        {trend && (
          <span className={cn(
            "text-xs font-medium",
            trend.positive ? "text-chart-up" : "text-chart-down"
          )}>
            {trend.positive ? "+" : ""}{trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Analyses"
        value="24"
        icon={<Activity className="h-4 w-4 text-primary" />}
        trend={{ value: "12%", positive: true }}
      />
      <StatCard
        label="Win Rate"
        value="68%"
        icon={<Target className="h-4 w-4 text-primary" />}
        trend={{ value: "5%", positive: true }}
      />
      <StatCard
        label="Avg. Probability"
        value="74%"
        icon={<TrendingUp className="h-4 w-4 text-primary" />}
      />
      <StatCard
        label="Best Pair"
        value="EUR/USD"
        icon={<Award className="h-4 w-4 text-primary" />}
      />
    </div>
  );
}
