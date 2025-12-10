import { cn } from "@/lib/utils";
import { Bias } from "@/types/analysis";

interface ProbabilityGaugeProps {
  probability: number;
  bias: Bias;
}

export function ProbabilityGauge({ probability, bias }: ProbabilityGaugeProps) {
  const getColor = () => {
    if (bias === "Buy") return "text-chart-up";
    if (bias === "Sell") return "text-chart-down";
    return "text-chart-neutral";
  };

  const getGradient = () => {
    if (bias === "Buy") return "from-chart-up/20 to-chart-up/5";
    if (bias === "Sell") return "from-chart-down/20 to-chart-down/5";
    return "from-chart-neutral/20 to-chart-neutral/5";
  };

  const getStroke = () => {
    if (bias === "Buy") return "stroke-chart-up";
    if (bias === "Sell") return "stroke-chart-down";
    return "stroke-chart-neutral";
  };

  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (probability / 100) * circumference;

  return (
    <div className={cn(
      "relative flex flex-col items-center justify-center p-6 rounded-2xl",
      "bg-gradient-to-b",
      getGradient()
    )}>
      <svg className="w-48 h-48 -rotate-90" viewBox="0 0 200 200">
        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-border/30"
        />
        {/* Progress circle */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className={cn(getStroke(), "transition-all duration-1000 ease-out")}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-5xl font-bold font-mono", getColor())}>
          {probability}%
        </span>
        <span className="text-sm text-muted-foreground mt-1">Probability</span>
      </div>
    </div>
  );
}
