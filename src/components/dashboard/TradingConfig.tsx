import { 
  TradingPair, 
  Timeframe, 
  TradingStyle, 
  TRADING_PAIRS, 
  TIMEFRAMES, 
  TRADING_STYLES 
} from "@/types/analysis";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Coins, Clock, Target } from "lucide-react";

interface TradingConfigProps {
  pair: TradingPair;
  timeframe: Timeframe;
  style: TradingStyle;
  onPairChange: (pair: TradingPair) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onStyleChange: (style: TradingStyle) => void;
}

export function TradingConfig({
  pair,
  timeframe,
  style,
  onPairChange,
  onTimeframeChange,
  onStyleChange,
}: TradingConfigProps) {
  const pairCategories = {
    "Major Pairs": ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "NZD/USD"],
    "Commodities": ["XAU/USD", "XAG/USD"],
    "Indices": ["NAS100", "US30", "US500", "GER40"],
    "Crypto": ["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD"],
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Trading Configuration
      </h3>
      
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Trading Pair */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Coins className="h-4 w-4 text-primary" />
            Trading Pair
          </label>
          <Select value={pair} onValueChange={(v) => onPairChange(v as TradingPair)}>
            <SelectTrigger className="glass-card border-border/50 h-12">
              <SelectValue placeholder="Select pair" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {Object.entries(pairCategories).map(([category, pairs]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {category}
                  </div>
                  {pairs.map((p) => (
                    <SelectItem key={p} value={p} className="cursor-pointer">
                      {p}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timeframe */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            Timeframe
          </label>
          <Select value={timeframe} onValueChange={(v) => onTimeframeChange(v as Timeframe)}>
            <SelectTrigger className="glass-card border-border/50 h-12">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf} value={tf} className="cursor-pointer">
                  {tf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Trading Style */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Trading Style
          </label>
          <Select value={style} onValueChange={(v) => onStyleChange(v as TradingStyle)}>
            <SelectTrigger className="glass-card border-border/50 h-12">
              <SelectValue placeholder="Select style" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {TRADING_STYLES.map((s) => (
                <SelectItem key={s} value={s} className="cursor-pointer">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
