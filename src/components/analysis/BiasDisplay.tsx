import { TrendingUp, TrendingDown, MinusCircle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Bias, Trend } from "@/types/analysis";
import { cn } from "@/lib/utils";

interface BiasDisplayProps {
  bias: Bias;
  trend: Trend;
}

export function BiasDisplay({ bias, trend }: BiasDisplayProps) {
  const getBiasIcon = () => {
    switch (bias) {
      case "Buy":
        return <ArrowUpCircle className="h-16 w-16" />;
      case "Sell":
        return <ArrowDownCircle className="h-16 w-16" />;
      default:
        return <MinusCircle className="h-16 w-16" />;
    }
  };

  const getBiasColor = () => {
    switch (bias) {
      case "Buy":
        return "text-chart-up";
      case "Sell":
        return "text-chart-down";
      default:
        return "text-chart-neutral";
    }
  };

  const getBiasBackground = () => {
    switch (bias) {
      case "Buy":
        return "bg-chart-up/10 border-chart-up/30";
      case "Sell":
        return "bg-chart-down/10 border-chart-down/30";
      default:
        return "bg-chart-neutral/10 border-chart-neutral/30";
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "Uptrend":
        return <TrendingUp className="h-5 w-5 text-chart-up" />;
      case "Downtrend":
        return <TrendingDown className="h-5 w-5 text-chart-down" />;
      default:
        return <MinusCircle className="h-5 w-5 text-chart-neutral" />;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cn(
        "p-8 rounded-2xl border-2 transition-all",
        getBiasBackground()
      )}>
        <div className={cn("transition-colors", getBiasColor())}>
          {getBiasIcon()}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Badge
          variant={bias === "Buy" ? "buy" : bias === "Sell" ? "sell" : "neutral"}
          className="text-lg px-6 py-2"
        >
          {bias.toUpperCase()}
        </Badge>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {getTrendIcon()}
          <span>{trend}</span>
        </div>
      </div>
    </div>
  );
}
