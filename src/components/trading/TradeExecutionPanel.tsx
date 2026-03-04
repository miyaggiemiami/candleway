import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Square, AlertTriangle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { AnalysisResult } from "@/types/analysis";
import { RiskSettings, Trade } from "@/types/trading";
import { useToast } from "@/hooks/use-toast";

interface TradeExecutionPanelProps {
  analysis: AnalysisResult | null;
  riskSettings: RiskSettings | null;
  onExecuteTrade: (trade: any) => Promise<{ data?: Trade; error?: any }>;
  todayStats: { count: number; pnl: number; losses: number; openCount: number };
  hasConsented: boolean;
  onRequestConsent: () => void;
}

export function TradeExecutionPanel({
  analysis,
  riskSettings,
  onExecuteTrade,
  todayStats,
  hasConsented,
  onRequestConsent,
}: TradeExecutionPanelProps) {
  const [executing, setExecuting] = useState(false);
  const [lotSize, setLotSize] = useState('0.01');
  const { toast } = useToast();

  if (!analysis) return null;

  const direction = analysis.bias === 'Buy' ? 'BUY' : analysis.bias === 'Sell' ? 'SELL' : 'WAIT';

  // Risk checks
  const riskBlocked = riskSettings && (
    todayStats.count >= riskSettings.max_trades_per_day ||
    riskSettings.kill_switch_active ||
    analysis.probability < riskSettings.confidence_threshold
  );

  const blockReason = riskSettings ? (
    riskSettings.kill_switch_active ? 'Kill switch is active' :
    todayStats.count >= riskSettings.max_trades_per_day ? 'Max daily trades reached' :
    analysis.probability < riskSettings.confidence_threshold ? `Confidence ${analysis.probability}% < threshold ${riskSettings.confidence_threshold}%` :
    null
  ) : null;

  const handleExecute = async () => {
    if (!hasConsented) {
      onRequestConsent();
      return;
    }

    if (direction === 'WAIT') {
      toast({
        title: "Cannot execute",
        description: "Signal is WAIT - no clear trade direction.",
        variant: "destructive",
      });
      return;
    }

    setExecuting(true);
    try {
      const slPrice = parseFloat(analysis.stopLoss) || 0;
      const tpPrice = parseFloat(analysis.takeProfit) || 0;
      const entryPrice = slPrice && tpPrice ? (slPrice + tpPrice) / 2 : 0;
      const rr = slPrice && tpPrice && entryPrice
        ? Math.abs(tpPrice - entryPrice) / Math.abs(entryPrice - slPrice)
        : 0;

      const { error } = await onExecuteTrade({
        analysis_id: analysis.id,
        pair: analysis.pair,
        direction,
        entry_price: entryPrice,
        stop_loss: slPrice,
        take_profit: tpPrice,
        lot_size: parseFloat(lotSize),
        execution_mode: riskSettings?.automation_mode || 'manual',
        risk_reward: Math.round(rr * 100) / 100,
        confidence: analysis.probability,
      });

      if (error) throw error;

      toast({
        title: "Paper Trade Opened",
        description: `${direction} ${analysis.pair} @ ${entryPrice.toFixed(5)} | Lot: ${lotSize}`,
      });
    } catch (err: any) {
      toast({
        title: "Execution Failed",
        description: err.message || "Failed to execute trade.",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card className="glass-card-glow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Trade Execution
          </span>
          <Badge variant="outline" className="text-xs">Paper Trading</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Signal Summary */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-2">
            {direction === 'BUY' ? (
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            ) : direction === 'SELL' ? (
              <TrendingDown className="h-5 w-5 text-destructive" />
            ) : (
              <Square className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-semibold">{direction}</span>
            <span className="text-muted-foreground">{analysis.pair}</span>
          </div>
          <span className="font-mono text-primary">{analysis.probability}%</span>
        </div>

        {/* Lot Size */}
        <div className="space-y-2">
          <Label>Lot Size</Label>
          <Input
            type="number"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            min="0.01"
            step="0.01"
            className="glass-card font-mono"
          />
        </div>

        {/* SL/TP Display */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-xs text-muted-foreground">Stop Loss</p>
            <p className="font-mono font-semibold text-destructive">{analysis.stopLoss}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs text-muted-foreground">Take Profit</p>
            <p className="font-mono font-semibold text-primary">{analysis.takeProfit}</p>
          </div>
        </div>

        {/* Risk Block Warning */}
        {riskBlocked && blockReason && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{blockReason}</p>
          </div>
        )}

        {/* Execute Button */}
        <Button
          onClick={handleExecute}
          disabled={executing || direction === 'WAIT' || !!riskBlocked}
          className="w-full"
          variant={direction === 'BUY' ? 'default' : direction === 'SELL' ? 'destructive' : 'secondary'}
        >
          {executing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Executing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Execute Paper Trade
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Paper trading mode — no real money at risk
        </p>
      </CardContent>
    </Card>
  );
}
