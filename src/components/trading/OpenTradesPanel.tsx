import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Trade } from "@/types/trading";
import { useState } from "react";

interface OpenTradesPanelProps {
  trades: Trade[];
  onCloseTrade: (id: string, outcome: 'win' | 'loss' | 'breakeven', pnl: number) => Promise<{ error?: any }>;
  onCancelTrade: (id: string) => Promise<{ error?: any }>;
}

export function OpenTradesPanel({ trades, onCloseTrade, onCancelTrade }: OpenTradesPanelProps) {
  const openTrades = trades.filter(t => t.status === 'open');
  const [closingPnl, setClosingPnl] = useState<Record<string, string>>({});

  if (openTrades.length === 0) return null;

  const handleClose = async (trade: Trade) => {
    const pnl = parseFloat(closingPnl[trade.id] || '0');
    const outcome = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven';
    await onCloseTrade(trade.id, outcome as 'win' | 'loss' | 'breakeven', pnl);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Open Trades
          </span>
          <Badge variant="outline">{openTrades.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {openTrades.map((trade) => (
          <div key={trade.id} className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {trade.direction === 'BUY' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className="font-semibold text-sm">{trade.pair}</span>
                <Badge variant={trade.direction === 'BUY' ? 'buy' : 'sell'} className="text-xs">
                  {trade.direction}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {Number(trade.entry_price).toFixed(5)}
              </span>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Close P&L ($)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={closingPnl[trade.id] || ''}
                  onChange={(e) => setClosingPnl(prev => ({ ...prev, [trade.id]: e.target.value }))}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => handleClose(trade)}>
                Close
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onCancelTrade(trade.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
