import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Play, Square, AlertTriangle, TrendingUp, TrendingDown, Loader2, Wifi, WifiOff, Hand, Bot, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { AnalysisResult } from "@/types/analysis";
import { RiskSettings, Trade, AutomationMode } from "@/types/trading";
import { useToast } from "@/hooks/use-toast";
import { useMetaTrader } from "@/hooks/useMetaTrader";

interface TradeExecutionPanelProps {
  analysis: AnalysisResult | null;
  riskSettings: RiskSettings | null;
  onExecuteTrade: (trade: any) => Promise<{ data?: Trade; error?: any }>;
  todayStats: { count: number; pnl: number; losses: number; openCount: number };
  hasConsented: boolean;
  onRequestConsent: () => void;
}

const MODE_CONFIG: Record<AutomationMode, { label: string; icon: typeof Hand; description: string }> = {
  manual: {
    label: 'Manual',
    icon: Hand,
    description: 'You review and execute trades yourself',
  },
  assisted: {
    label: 'Assisted',
    icon: Bot,
    description: 'AI prepares trade, you confirm before sending',
  },
  auto: {
    label: 'Auto Trade',
    icon: Zap,
    description: 'Paper trade executes automatically',
  },
};

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
  const [liveMode, setLiveMode] = useState(false);
  const [tradeMode, setTradeMode] = useState<AutomationMode>('manual');
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const { toast } = useToast();
  const { accountInfo, connected, loading: mtLoading, getAccountInfo, executeLiveTrade } = useMetaTrader();

  // Check MT connection when switching to live mode
  useEffect(() => {
    if (liveMode && !connected && !mtLoading) {
      getAccountInfo();
    }
  }, [liveMode, connected, mtLoading, getAccountInfo]);

  // Auto-execute for 'auto' mode when analysis arrives
  useEffect(() => {
    if (tradeMode === 'auto' && analysis && analysis.bias !== 'No Trade') {
      handleExecuteInternal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, tradeMode]);

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

  async function handleExecuteInternal() {
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

    if (riskBlocked) return;

    setExecuting(true);
    try {
      const slPrice = parseFloat(analysis.stopLoss) || 0;
      const tpPrice = parseFloat(analysis.takeProfit) || 0;

      if (liveMode) {
        const result = await executeLiveTrade({
          symbol: analysis.pair,
          direction: direction as 'BUY' | 'SELL',
          volume: parseFloat(lotSize),
          stopLoss: slPrice > 0 ? slPrice : undefined,
          takeProfit: tpPrice > 0 ? tpPrice : undefined,
        });
        if (!result.success) throw new Error(result.error);
      } else {
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
          execution_mode: tradeMode,
          risk_reward: Math.round(rr * 100) / 100,
          confidence: analysis.probability,
        });

        if (error) throw error;

        toast({
          title: tradeMode === 'auto' ? "Auto Trade Executed" : "Paper Trade Opened",
          description: `${direction} ${analysis.pair} @ ${entryPrice.toFixed(5)} | Lot: ${lotSize}`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Execution Failed",
        description: err.message || "Failed to execute trade.",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
      setAwaitingConfirm(false);
    }
  }

  const handleExecute = async () => {
    if (tradeMode === 'assisted' && !awaitingConfirm) {
      setAwaitingConfirm(true);
      return;
    }
    await handleExecuteInternal();
  };

  return (
    <Card className="glass-card-glow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Trade Execution
          </span>
          <div className="flex items-center gap-2">
            {liveMode && (
              connected ? (
                <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">
                  <Wifi className="h-3 w-3 mr-1" />
                  MT Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )
            )}
            <Badge variant={liveMode ? "destructive" : "outline"} className="text-xs">
              {liveMode ? '🔴 LIVE' : 'Paper'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trade Mode Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Execution Mode</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(MODE_CONFIG) as AutomationMode[]).map((mode) => {
              const config = MODE_CONFIG[mode];
              const Icon = config.icon;
              const isActive = tradeMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setTradeMode(mode);
                    setAwaitingConfirm(false);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{config.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {MODE_CONFIG[tradeMode].description}
          </p>
        </div>

        {/* Live/Paper Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Live Trading</Label>
            <p className="text-xs text-muted-foreground">
              {liveMode ? 'Trades execute on your MT account' : 'Simulated paper trades'}
            </p>
          </div>
          <Switch
            checked={liveMode}
            onCheckedChange={setLiveMode}
          />
        </div>

        {/* Account Info (Live mode) */}
        {liveMode && accountInfo && (
          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-secondary/30 text-xs">
            <div>
              <span className="text-muted-foreground">Balance:</span>
              <span className="ml-1 font-mono font-semibold">${accountInfo.balance?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Equity:</span>
              <span className="ml-1 font-mono font-semibold">${accountInfo.equity?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Free Margin:</span>
              <span className="ml-1 font-mono font-semibold">${accountInfo.freeMargin?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Leverage:</span>
              <span className="ml-1 font-mono font-semibold">1:{accountInfo.leverage}</span>
            </div>
          </div>
        )}

        {/* Live mode warning */}
        {liveMode && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400">
              <strong>Real money at risk.</strong> Trades will execute on your live MetaTrader account.
            </p>
          </div>
        )}

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

        {/* Assisted mode confirmation */}
        {awaitingConfirm && tradeMode === 'assisted' && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
            <p className="text-sm text-amber-400 font-medium">
              ⚡ Confirm this trade?
            </p>
            <p className="text-xs text-muted-foreground">
              {direction} {analysis.pair} | Lot: {lotSize} | SL: {analysis.stopLoss} | TP: {analysis.takeProfit}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleExecuteInternal} disabled={executing}>
                {executing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Confirm & Send
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAwaitingConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Execute Button */}
        {tradeMode !== 'auto' && !awaitingConfirm && (
          <Button
            onClick={handleExecute}
            disabled={executing || mtLoading || direction === 'WAIT' || !!riskBlocked || (liveMode && !connected)}
            className="w-full"
            variant={direction === 'BUY' ? 'default' : direction === 'SELL' ? 'destructive' : 'secondary'}
          >
            {executing || mtLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {mtLoading ? 'Connecting...' : 'Executing...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {tradeMode === 'assisted'
                  ? 'Prepare Trade'
                  : liveMode ? 'Execute Live Trade' : 'Execute Paper Trade'}
              </>
            )}
          </Button>
        )}

        {tradeMode === 'auto' && (
          <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs text-primary font-medium">
              ⚡ Auto mode active — trades execute automatically when signals meet your risk criteria
            </p>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground">
          {liveMode
            ? '⚠️ Live trading — real funds will be used'
            : 'Paper trading mode — no real money at risk'}
        </p>
      </CardContent>
    </Card>
  );
}
